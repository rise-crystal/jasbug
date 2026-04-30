import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSafeJakartaTimeSnapshot } from '@/lib/payment-expiry';

/**
 * Admin endpoint untuk verifikasi pembayaran
 * PUT /api/payment/verify/[orderId]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { orderId } = resolvedParams;
    const body = await request.json();
    const { verified, reason } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID diperlukan' },
        { status: 400 }
      );
    }

    if (typeof verified !== 'boolean') {
      return NextResponse.json(
        { error: 'Parameter "verified" harus boolean (true/false)' },
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

    // Cek order exists
    console.log('🔍 Fetching order with ID:', orderId);
    
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .or(`id.eq.${orderId},custom_id.eq.${orderId}`)
      .single();

    console.log('📦 Order fetch result:', { 
      data: order ? { id: order.id, custom_id: order.custom_id } : null, 
      error: fetchError 
    });

    if (fetchError || !order) {
      console.error('❌ Order not found:', { fetchError, orderId });
      return NextResponse.json(
        { error: 'Order tidak ditemukan' },
        { status: 404 }
      );
    }

    const jakartaTime = await getSafeJakartaTimeSnapshot();

    // Cek apakah sudah ada bukti pembayaran
    const hasPaymentProof = order.payment_proof_url;

    // Jika diverifikasi tapi belum ada bukti, tolak
    if (verified && !hasPaymentProof) {
      return NextResponse.json(
        { error: 'Order belum memiliki bukti pembayaran' },
        { status: 400 }
      );
    }

    // Update order status
    const updateData: any = {
      payment_proof_verified: verified,
      payment_proof_verified_at: jakartaTime.isoUtc,
      // payment_verified_by: userId, // TODO: Get from auth session
    };

    if (verified) {
      // Jika disetujui, harus ada bukti pembayaran
      updateData.status = 'berhasil';
      updateData.bug_delivery_status = 'sent';
      updateData.bug_sent_at = jakartaTime.isoUtc;
    } else if (!hasPaymentProof && !verified) {
      // Jika ditolak DAN tidak ada bukti (expired/timeout), set ke gagal tanpa perlu validasi bukti
      updateData.status = 'gagal';
      updateData.bug_delivery_status = 'failed';
    } else {
      // Jika ditolak tapi ada bukti (admin reject)
      updateData.status = 'gagal';
      updateData.bug_delivery_status = 'failed';
    }

    console.log('📤 Updating order with:', updateData);

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .or(`id.eq.${orderId},custom_id.eq.${orderId}`);

    if (updateError) {
      console.error('Update order error:', updateError);
      return NextResponse.json(
        { error: 'Gagal update order' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: verified 
        ? 'Pembayaran berhasil diverifikasi' 
        : (hasPaymentProof ? 'Pembayaran ditolak' : 'Order expired - otomatis gagal'),
      orderId,
      newStatus: verified ? 'berhasil' : 'gagal',
      hasPaymentProof,
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
