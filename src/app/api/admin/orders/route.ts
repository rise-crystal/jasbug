import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/admin-auth';
import { autoExpirePendingOrders, fetchOrdersList } from '@/lib/orders';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const unauthorizedResponse = await requireAdminRequest(request);

    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const supabaseAdmin = getSupabaseAdmin();

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database tidak terkonfigurasi' },
        { status: 500 }
      );
    }

    const scope = request.nextUrl.searchParams.get('scope');
    const pendingOnly = scope === 'pending';
    const sortAscending = request.nextUrl.searchParams.get('sort') === 'oldest';

    const autoExpireResult = await autoExpirePendingOrders(supabaseAdmin);
    const orders = await fetchOrdersList(supabaseAdmin, { pendingOnly, sortAscending });

    return NextResponse.json({
      success: true,
      serverNowMs: autoExpireResult.serverNowMs,
      autoExpiredCount: autoExpireResult.expiredCount,
      orders,
    });
  } catch (error) {
    console.error('Admin orders fetch error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil daftar order admin', details: (error as Error).message },
      { status: 500 }
    );
  }
}
