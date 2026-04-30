import { NextRequest, NextResponse } from 'next/server';
import { autoExpirePendingOrders, fetchOrdersList } from '@/lib/orders';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database tidak terkonfigurasi' },
        { status: 500 }
      );
    }

    const sortAscending = request.nextUrl.searchParams.get('sort') === 'oldest';
    const autoExpireResult = await autoExpirePendingOrders(supabaseAdmin);
    const orders = await fetchOrdersList(supabaseAdmin, { sortAscending });

    return NextResponse.json({
      success: true,
      serverNowMs: autoExpireResult.serverNowMs,
      autoExpiredCount: autoExpireResult.expiredCount,
      orders,
    });
  } catch (error) {
    console.error('Public orders fetch error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil daftar order', details: (error as Error).message },
      { status: 500 }
    );
  }
}
