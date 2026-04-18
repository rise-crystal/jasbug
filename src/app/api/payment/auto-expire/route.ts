import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getPaymentExpiryState, getSafeJakartaNowMs, shouldAutoExpirePayment } from '@/lib/payment-expiry';

// Force dynamic rendering untuk API endpoint
export const dynamic = 'force-dynamic';

/**
 * POST /api/payment/auto-expire
 *
 * Auto-expire semua order dengan status 'pending_pembayaran' yang sudah lewat 5 menit.
 * Endpoint ini bisa dipanggil manual atau via cron job.
 *
 * Security: Memerlukan CRON_SECRET header dari Vercel Cron Jobs
 */
export async function POST(request: NextRequest) {
  try {
    // Validasi CRON_SECRET dari Vercel
    // Vercel secara otomatis menambahkan CRON_SECRET ke header Authorization
    // sebagai "Bearer <CRON_SECRET>" saat cron job dipanggil
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    const originHeader = request.headers.get('origin');
    let isSameOriginBrowserRequest = false;

    if (originHeader) {
      try {
        isSameOriginBrowserRequest = new URL(originHeader).host === new URL(request.url).host;
      } catch {
        isSameOriginBrowserRequest = false;
      }
    }

    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !isSameOriginBrowserRequest) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing CRON_SECRET' },
        { status: 401 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database tidak terkonfigurasi' },
        { status: 500 }
      );
    }

    console.log('⏰ Starting auto-expire process...');

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

    if (!expiredOrders || expiredOrders.length === 0) {
      console.log('✅ No expired orders found');
      return NextResponse.json({
        success: true,
        message: 'Tidak ada order yang perlu di-expire',
        serverNowMs: nowMs,
        expiredCount: 0,
        expiredOrders: [],
      });
    }

    console.log(`📦 Found ${expiredOrders.length} expired order(s)`);

    // Update semua order yang expired
    const orderIds = expiredOrders.map(order => order.id);
    
    const { data: updateData, error: updateError } = await supabaseAdmin
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

    console.log(`✅ Successfully expired ${expiredOrders.length} order(s)`);

    return NextResponse.json({
      success: true,
      message: `Berhasil expire ${expiredOrders.length} order(s)`,
      serverNowMs: nowMs,
      expiredCount: expiredOrders.length,
      expiredOrders: expiredOrders.map(order => ({
        id: order.id,
        custom_id: order.custom_id,
        created_at: order.created_at,
        previousStatus: order.status,
        newStatus: 'expired',
        minutesAgo: Math.floor((nowMs - new Date(order.created_at).getTime()) / 60000),
      })),
    });
  } catch (error) {
    console.error('Auto-expire error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payment/auto-expire
 * 
 * Preview order yang akan di-expire (dry run)
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database tidak terkonfigurasi' },
        { status: 500 }
      );
    }

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

    return NextResponse.json({
      success: true,
      serverNowMs: nowMs,
      expiredCount: expiredOrders?.length || 0,
      expiredOrders: expiredOrders?.map(order => ({
        id: order.id,
        custom_id: order.custom_id,
        created_at: order.created_at,
        status: order.status,
        minutesAgo: Math.floor((nowMs - new Date(order.created_at).getTime()) / 60000),
        remainingMs: Math.max(0, getPaymentExpiryState(order.created_at, nowMs).remainingMs),
      })) || [],
    });
  } catch (error) {
    console.error('Auto-expire preview error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server', details: (error as Error).message },
      { status: 500 }
    );
  }
}
