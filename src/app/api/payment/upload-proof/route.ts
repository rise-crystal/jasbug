import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSafeJakartaNowMs, shouldAutoExpirePayment } from '@/lib/payment-expiry';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const orderId = formData.get('orderId') as string;

    if (!file || !orderId) {
      return NextResponse.json(
        { error: 'File dan Order ID diperlukan' },
        { status: 400 }
      );
    }

    // Validasi file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format file tidak didukung. Gunakan: JPG, PNG, WebP, atau PDF' },
        { status: 400 }
      );
    }

    // Validasi ukuran (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Ukuran file terlalu besar. Maksimal 5MB' },
        { status: 400 }
      );
    }

    // Upload file ke Supabase Storage
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database tidak terkonfigurasi' },
        { status: 500 }
      );
    }

    // Pastikan order memang ada sebelum file di-upload ke storage
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, custom_id, status, created_at, payment_proof_url')
      .or(`id.eq.${orderId},custom_id.eq.${orderId}`)
      .maybeSingle();

    if (orderError) {
      console.error('Fetch order error:', orderError);
      return NextResponse.json(
        { error: 'Gagal mengambil data order' },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { error: 'Order tidak ditemukan' },
        { status: 404 }
      );
    }

    const nowMs = await getSafeJakartaNowMs();

    if (shouldAutoExpirePayment(order, nowMs)) {
      await supabaseAdmin
        .from('orders')
        .update({ status: 'expired' })
        .eq('id', order.id);

      return NextResponse.json(
        { error: 'Order sudah expired. Upload bukti dibatasi maksimal 5 menit.' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${orderId}-${timestamp}-${randomStr}.${ext}`;
    const proofPath = `proofs/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('payment-proofs')
      .upload(proofPath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError || !uploadData) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Gagal upload file: ' + (uploadError?.message || 'Unknown error') },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('payment-proofs')
      .getPublicUrl(proofPath);

    const proofUrl = urlData.publicUrl;

    // Update order dengan payment proof - set status ke pending_konfirmasi_admin
    const { data: updatedOrders, error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        payment_proof_url: proofUrl,
        status: 'pending_konfirmasi_admin', // Set status ke pending_konfirmasi_admin
        payment_proof_verified: false,
        payment_proof_verified_at: null,
      })
      .eq('id', order.id)
      .select('id');

    if (updateError || !updatedOrders || updatedOrders.length === 0) {
      await supabaseAdmin.storage.from('payment-proofs').remove([proofPath]);
      console.error('Update order error:', updateError);
      console.error('Order ID:', orderId);
      console.error('Resolved Order:', order);
      console.error('Proof URL:', proofUrl);
      if (updateError) {
        console.error('Error details:', JSON.stringify(updateError, null, 2));
      }
      return NextResponse.json(
        { 
          error: 'Gagal update order',
          details: updateError?.message || 'Order tidak ditemukan saat proses update',
          code: updateError?.code,
          hint: updateError?.hint,
        },
        { status: 500 }
      );
    }

    console.log('✅ Order updated successfully:', order.id);

    return NextResponse.json({
      success: true,
      message: 'Bukti pembayaran berhasil diupload',
      proofUrl: proofUrl,
    });
  } catch (error) {
    console.error('Upload payment proof error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
