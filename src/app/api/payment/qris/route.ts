import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { QRISDinamis } from '@/lib/qris-dinamis';

// QRIS statis dasar dari merchant (contoh: DANA)
// Ganti dengan QRIS statis merchant Anda yang sebenarnya
const BASE_QRIS = process.env.QRIS_STATIC_CODE || '00020101021126570011ID.DANA.WWW011893600915300050135802090005013580303UMI51440014ID.CO.QRIS.WWW0215ID10264732425470303UMI5204654053033605802ID5908SkyQueen6011Kota Bekasi6105171526304490D';

// Harga produk (dalam rupiah)
const PRODUCT_PRICES: Record<string, number> = {
  'computer-bug': 10000,
};

export async function POST(request: NextRequest) {
  try {
    console.log('QRIS API called');
    const body = await request.json();
    const { orderId } = body;
    console.log('Order ID:', orderId);

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID diperlukan' },
        { status: 400 }
      );
    }

    // Ambil order dari database
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      console.error('Supabase admin not initialized');
      return NextResponse.json(
        { error: 'Database tidak terkonfigurasi' },
        { status: 500 }
      );
    }

    console.log('Fetching order from database...');
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .or(`id.eq.${orderId},custom_id.eq.${orderId}`)
      .single();

    console.log('Order fetch result:', { data: order, error: fetchError });

    if (fetchError || !order) {
      console.error('Order not found:', fetchError);
      return NextResponse.json(
        { error: 'Order tidak ditemukan' },
        { status: 404 }
      );
    }

    // Cek jika order sudah dibayar
    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: `Order sudah ${order.status}, tidak bisa diproses lagi` },
        { status: 400 }
      );
    }

    // Tentukan jumlah pembayaran
    const productId = order.product_id || 'computer-bug';
    const amount = PRODUCT_PRICES[productId] || 10000;
    console.log('Product ID:', productId, 'Amount:', amount);

    // Generate QRIS dinamis
    try {
      console.log('Generating QRIS...');
      const qris = new QRISDinamis(BASE_QRIS);
      console.log('QRIS instance created');
      
      const qrisDinamis = qris.setAmount(amount);
      console.log('QRIS dynamic created');
      
      // Generate QR Code sebagai data URL
      const qrCodeDataUrl = await qrisDinamis.generateQRCodeDataUrl(300);
      console.log('QR Code generated:', qrCodeDataUrl ? 'Success' : 'Failed');

      if (!qrCodeDataUrl) {
        return NextResponse.json(
          { error: 'Gagal generate QR Code' },
          { status: 500 }
        );
      }

      // Simpan QRIS string ke database
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          qris_string: qrisDinamis.toString(),
          payment_amount: amount,
        })
        .eq('id', order.id);

      if (updateError) {
        console.error('Error updating order:', updateError);
      }

      console.log('Returning success response');
      return NextResponse.json({
        success: true,
        orderId: order.id,
        amount: amount,
        qrisString: qrisDinamis.toString(),
        qrCodeDataUrl: qrCodeDataUrl,
        merchantName: qrisDinamis.getInfo()['Merchant Name'],
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });
    } catch (qrisError) {
      console.error('QRIS generation error:', qrisError);
      return NextResponse.json(
        { error: 'Gagal generate QRIS pembayaran: ' + (qrisError as Error).message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Payment QRIS error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
