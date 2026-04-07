'use server';

import { phoneSchema } from './security';
import { getSupabaseAdmin } from './supabase';
import { QRISDinamis } from './qris-dinamis';

// QRIS statis dasar dari merchant
const BASE_QRIS = process.env.QRIS_STATIC_CODE || '00020101021126570011ID.DANA.WWW011893600915300050135802090005013580303UMI51440014ID.CO.QRIS.WWW0215ID10264732425470303UMI5204654053033605802ID5908SkyQueen6011Kota Bekasi6105171526304490D';

// Harga produk (dalam rupiah)
const PRODUCT_PRICES: Record<string, number> = {
  'computer-bug': 10000,
};

export async function createOrder(phoneNumber: string, productId?: string) {
  try {
    // Validasi nomor telepon dengan schema yang aman
    const validatedPhone = phoneSchema.safeParse(phoneNumber);
    if (!validatedPhone.success) {
      return { error: validatedPhone.error.errors[0].message };
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return { error: 'Database tidak terkonfigurasi. Periksa environment variables.' };
    }

    // Buat order di database
    const insertData: any = {
      phone_number: validatedPhone.data,
      status: 'pending',
    };

    if (productId) {
      insertData.product_id = productId;
    }

    const { data: order, error: dbError } = await supabaseAdmin
      .from('orders')
      .insert(insertData)
      .select()
      .single();

    if (dbError || !order) {
      console.error('Database error:', dbError);
      return { error: 'Gagal membuat pesanan' };
    }

    // Auto-generate QRIS dinamis
    try {
      const product = productId || 'computer-bug';
      const amount = PRODUCT_PRICES[product] || 10000;

      console.log('Auto-generating QRIS for order:', order.id);
      const qris = new QRISDinamis(BASE_QRIS);
      const qrisDinamis = qris.setAmount(amount);

      const qrCodeDataUrl = await qrisDinamis.generateQRCodeDataUrl(300);

      if (qrCodeDataUrl) {
        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update({
            qris_string: qrisDinamis.toString(),
            payment_amount: amount,
          })
          .eq('id', order.id);

        if (updateError) {
          console.error('Error updating order with QRIS:', updateError);
        } else {
          console.log('QRIS auto-generated successfully for order:', order.id);
        }
      }
    } catch (qrisError) {
      console.error('Auto-generate QRIS error:', qrisError);
      // Order tetap berhasil dibuat meski QRIS gagal
    }

    return {
      success: true,
      orderId: order.id,
    };
  } catch (error) {
    console.error('Create order error:', error);
    return { error: 'Terjadi kesalahan pada sistem' };
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: 'pending' | 'berhasil' | 'gagal' | 'expired'
) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return { error: 'Database tidak terkonfigurasi' };
    }

    // Validasi status
    const validStatuses = ['pending', 'berhasil', 'gagal', 'expired'];
    if (!validStatuses.includes(status)) {
      return { error: 'Status tidak valid' };
    }

    const { error } = await supabaseAdmin
      .from('orders')
      .update({ status })
      .or(`id.eq.${orderId},custom_id.eq.${orderId}`);

    if (error) {
      console.error('Update order error:', error);
      return { error: 'Gagal mengupdate status pesanan' };
    }

    return { success: true };
  } catch (error) {
    console.error('Update order status error:', error);
    return { error: 'Terjadi kesalahan pada sistem' };
  }
}
