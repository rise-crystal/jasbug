import { NextRequest, NextResponse } from 'next/server';
import { hasValidAdminSession } from '@/lib/admin-session';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getPaymentExpiryState, getSafeJakartaNowMs, shouldAutoExpirePayment } from '@/lib/payment-expiry';

// Force dynamic rendering untuk API endpoint
export const dynamic = 'force-dynamic';

/**
 * Auto-expire semua order dengan status 'pending_pembayaran' yang sudah lewat 5 menit.
 * GET dipakai oleh Vercel Cron Jobs, POST bisa dipakai manual oleh admin.
 */
export async function POST(request: NextRequest) {
  const authError = await authorizeAutoExpireRequest(request);

  if (authError) {
    return authError;
  }

  return runAutoExpireJob(request);
}

/**
 * GET /api/payment/auto-expire
 *
 * Dipakai oleh Vercel Cron Jobs.
 * Tambahkan `?preview=1` jika ingin dry-run manual.
 */
export async function GET(request: NextRequest) {
  const authError = await authorizeAutoExpireRequest(request);

  if (authError) {
    return authError;
  }

  return runAutoExpireJob(request);
}

type PendingOrderRow = {
  id: string;
  custom_id?: string | null;
  created_at: string;
  status: string;
  payment_proof_url: string | null;
};

async function authorizeAutoExpireRequest(request: NextRequest): Promise<NextResponse | null> {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isCronRequest = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;
  const isAdmin = await hasValidAdminSession(request);

  if (isCronRequest || isAdmin) {
    return null;
  }

  return NextResponse.json(
    { error: 'Unauthorized: cron secret or admin session required' },
    { status: 401 }
  );
}

async function runAutoExpireJob(request: NextRequest): Promise<NextResponse> {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database tidak terkonfigurasi' },
        { status: 500 }
      );
    }

    const previewMode = request.nextUrl.searchParams.get('preview') === '1';
    const nowMs = await getSafeJakartaNowMs();

    const { data: pendingOrders, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, custom_id, created_at, status, payment_proof_url')
      .eq('status', 'pending_pembayaran')
      .is('payment_proof_url', null)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching expired orders:', fetchError);
      return NextResponse.json(
        { error: 'Gagal mengambil order yang expired', details: fetchError.message },
        { status: 500 }
      );
    }

    const expiredOrders = (pendingOrders || []).filter(order => shouldAutoExpirePayment(order, nowMs));
    const expiredOrderSummaries = buildExpiredOrderSummaries(expiredOrders, nowMs);

    if (expiredOrders.length === 0) {
      return NextResponse.json({
        success: true,
        preview: previewMode,
        message: 'Tidak ada order yang perlu di-expire',
        serverNowMs: nowMs,
        expiredCount: 0,
        expiredOrders: [],
      });
    }

    if (previewMode) {
      return NextResponse.json({
        success: true,
        preview: true,
        message: `Preview ${expiredOrders.length} order(s) yang akan di-expire`,
        serverNowMs: nowMs,
        expiredCount: expiredOrders.length,
        expiredOrders: expiredOrderSummaries,
      });
    }

    const orderIds = expiredOrders.map(order => order.id);
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'expired' })
      .in('id', orderIds);

    if (updateError) {
      console.error('Error updating expired orders:', updateError);
      return NextResponse.json(
        { error: 'Gagal update status order', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      preview: false,
      message: `Berhasil expire ${expiredOrders.length} order(s)`,
      serverNowMs: nowMs,
      expiredCount: expiredOrders.length,
      expiredOrders: expiredOrderSummaries,
    });
  } catch (error) {
    console.error('Auto-expire error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server', details: (error as Error).message },
      { status: 500 }
    );
  }
}

function buildExpiredOrderSummaries(expiredOrders: PendingOrderRow[], nowMs: number) {
  return expiredOrders.map(order => ({
    id: order.id,
    custom_id: order.custom_id ?? null,
    created_at: order.created_at,
    previousStatus: order.status,
    newStatus: 'expired',
    minutesAgo: Math.floor((nowMs - new Date(order.created_at).getTime()) / 60000),
    remainingMs: Math.max(0, getPaymentExpiryState(order.created_at, nowMs).remainingMs),
  }));
}
