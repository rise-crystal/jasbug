import { NextRequest, NextResponse } from 'next/server';
import { hasValidAdminSession } from '@/lib/admin-session';
import { getSupabaseAdmin } from '@/lib/supabase';
import { autoExpirePendingOrders } from '@/lib/orders';

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
    const autoExpireResult = await autoExpirePendingOrders(supabaseAdmin, undefined, {
      dryRun: previewMode,
    });
    const { serverNowMs, expiredCount, expiredOrders } = autoExpireResult;

    if (expiredCount === 0) {
      return NextResponse.json({
        success: true,
        preview: previewMode,
        message: 'Tidak ada order yang perlu di-expire',
        serverNowMs,
        expiredCount: 0,
        expiredOrders: [],
      });
    }

    if (previewMode) {
      return NextResponse.json({
        success: true,
        preview: true,
        message: `Preview ${expiredCount} order(s) yang akan di-expire`,
        serverNowMs,
        expiredCount,
        expiredOrders,
      });
    }

    return NextResponse.json({
      success: true,
      preview: false,
      message: `Berhasil expire ${expiredCount} order(s)`,
      serverNowMs,
      expiredCount,
      expiredOrders,
    });
  } catch (error) {
    console.error('Auto-expire error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server', details: (error as Error).message },
      { status: 500 }
    );
  }
}
