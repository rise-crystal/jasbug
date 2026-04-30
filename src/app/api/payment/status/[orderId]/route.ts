import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getPaymentExpiryState, getSafeJakartaNowMs, shouldAutoExpirePayment } from '@/lib/payment-expiry';

// Force dynamic rendering untuk API endpoint
export const dynamic = 'force-dynamic';

// GET - Check payment status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { orderId } = resolvedParams;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID diperlukan' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database tidak terkonfigurasi' },
        { status: 500 }
      );
    }

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .or(`id.eq.${orderId},custom_id.eq.${orderId}`)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: 'Order tidak ditemukan' },
        { status: 404 }
      );
    }

    const nowMs = await getSafeJakartaNowMs();
    let currentOrder = order;

    if (shouldAutoExpirePayment(currentOrder, nowMs)) {
      const { data: updatedOrder, error: updateError } = await supabaseAdmin
        .from('orders')
        .update({ status: 'expired' })
        .eq('id', currentOrder.id)
        .select('*')
        .single();

      if (updateError || !updatedOrder) {
        console.error('Auto-expire during status check failed:', updateError);
        return NextResponse.json(
          { error: 'Gagal auto-expire order', details: updateError?.message || 'Unknown error' },
          { status: 500 }
        );
      }

      currentOrder = updatedOrder;
    }

    const expiryState = getPaymentExpiryState(currentOrder.created_at, nowMs);

    return NextResponse.json({
      success: true,
      serverNowMs: nowMs,
      expiresAtMs: expiryState.expiresAtMs,
      remainingMs: Math.max(0, expiryState.remainingMs),
      isExpired: currentOrder.status === 'expired' || expiryState.isExpired,
      order: {
        id: currentOrder.id,
        custom_id: currentOrder.custom_id,
        phone_number: currentOrder.phone_number,
        status: currentOrder.status,
        product_id: currentOrder.product_id,
        payment_amount: currentOrder.payment_amount,
        qris_string: currentOrder.qris_string,
        dana_transaction_id: currentOrder.dana_transaction_id,
        payment_proof_url: currentOrder.payment_proof_url,
        payment_proof_verified: currentOrder.payment_proof_verified,
        payment_proof_verified_at: currentOrder.payment_proof_verified_at,
        bug_delivery_status: currentOrder.bug_delivery_status,
        bug_sent_at: currentOrder.bug_sent_at,
        created_at: currentOrder.created_at,
      },
    });
  } catch (error) {
    console.error('Payment status check error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// PUT - Update payment status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const unauthorizedResponse = await requireAdminRequest(request);

    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const resolvedParams = await params;
    const { orderId } = resolvedParams;
    const body = await request.json();
    const { status } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'Order ID dan status diperlukan' },
        { status: 400 }
      );
    }

    const validStatuses = ['pending_pembayaran', 'pending_konfirmasi_admin', 'berhasil', 'gagal', 'expired'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Status tidak valid. Gunakan: pending_pembayaran, pending_konfirmasi_admin, berhasil, gagal, expired' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database tidak terkonfigurasi' },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ status })
      .or(`id.eq.${orderId},custom_id.eq.${orderId}`)
      .select('id, status')
      .maybeSingle();

    if (error || !data) {
      console.error(error);
      return NextResponse.json(
        { error: 'Gagal update status order', details: error?.message || 'Order tidak ditemukan' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Status order berhasil diupdate ke: ${status}`,
      orderId: data.id,
      newStatus: data.status,
    });
  } catch (error) {
    console.error('Update status error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
