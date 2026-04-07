import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

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

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        custom_id: order.custom_id,
        phone_number: order.phone_number,
        status: order.status,
        product_id: order.product_id,
        payment_amount: order.payment_amount,
        qris_string: order.qris_string,
        dana_transaction_id: order.dana_transaction_id,
        payment_proof_url: order.payment_proof_url,
        payment_proof_verified: order.payment_proof_verified,
        created_at: order.created_at,
        updated_at: order.updated_at,
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

    const validStatuses = ['pending', 'berhasil', 'gagal', 'expired'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Status tidak valid. Gunakan: pending, berhasil, gagal, expired' },
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

    console.log(`📝 Updating order ${orderId} to status: ${status}`);

    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .or(`id.eq.${orderId},custom_id.eq.${orderId}`)
      .select();

    if (updateError) {
      console.error('❌ Update order error:', updateError);
      return NextResponse.json(
        { error: 'Gagal update status order', details: updateError },
        { status: 500 }
      );
    }

    console.log('✅ Update successful:', updateData);

    return NextResponse.json({
      success: true,
      message: `Status order berhasil diupdate ke: ${status}`,
      orderId,
      newStatus: status,
    });
  } catch (error) {
    console.error('Update status error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
