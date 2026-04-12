import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

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

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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

    // Ambil semua order dengan status 'pending_pembayaran' yang dibuat lebih dari 5 menit yang lalu
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: expiredOrders, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, custom_id, created_at, status')
      .eq('status', 'pending_pembayaran')
      .is('payment_proof_url', null) // Hanya yang belum upload bukti
      .lt('created_at', fiveMinutesAgo);

    if (fetchError) {
      console.error('Error fetching expired orders:', fetchError);
      return NextResponse.json(
        { error: 'Gagal mengambil order yang expired', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      console.log('✅ No expired orders found');
      return NextResponse.json({
        success: true,
        message: 'Tidak ada order yang perlu di-expire',
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
      expiredCount: expiredOrders.length,
      expiredOrders: expiredOrders.map(order => ({
        id: order.id,
        custom_id: order.custom_id,
        created_at: order.created_at,
        previousStatus: order.status,
        newStatus: 'expired',
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

    // Ambil semua order dengan status 'pending_pembayaran' yang dibuat lebih dari 5 menit yang lalu
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: expiredOrders, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, custom_id, created_at, status, payment_proof_url')
      .eq('status', 'pending_pembayaran')
      .is('payment_proof_url', null)
      .lt('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching expired orders:', fetchError);
      return NextResponse.json(
        { error: 'Gagal mengambil order yang expired', details: fetchError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      expiredCount: expiredOrders?.length || 0,
      expiredOrders: expiredOrders?.map(order => ({
        id: order.id,
        custom_id: order.custom_id,
        created_at: order.created_at,
        status: order.status,
        minutesAgo: Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000),
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
