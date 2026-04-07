import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

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

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${orderId}-${timestamp}-${randomStr}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('payment-proofs')
      .upload(`proofs/${fileName}`, file, {
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
      .getPublicUrl(`proofs/${fileName}`);

    const proofUrl = urlData.publicUrl;

    // Update order dengan payment proof - set status ke pending_konfirmasi_admin
    // Coba dengan .eq() terlebih dahulu, fallback ke .or() jika perlu
    let { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        payment_proof_url: proofUrl,
        status: 'pending_konfirmasi_admin', // Set status ke pending_konfirmasi_admin
      })
      .eq('id', orderId);

    // Jika tidak ada row yang ter-update, coba dengan custom_id
    if (updateError) {
      console.log('Update with ID failed, trying custom_id...');
      const { error: updateError2 } = await supabaseAdmin
        .from('orders')
        .update({
          payment_proof_url: proofUrl,
          status: 'pending_konfirmasi_admin',
        })
        .eq('custom_id', orderId);

      updateError = updateError2;
    }

    if (updateError) {
      console.error('Update order error:', updateError);
      console.error('Order ID:', orderId);
      console.error('Proof URL:', proofUrl);
      console.error('Error details:', JSON.stringify(updateError, null, 2));
      return NextResponse.json(
        { 
          error: 'Gagal update order', 
          details: updateError.message,
          code: updateError.code,
          hint: updateError.hint,
        },
        { status: 500 }
      );
    }

    console.log('✅ Order updated successfully:', orderId);

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
