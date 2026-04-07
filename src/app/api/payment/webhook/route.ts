import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Webhook handler untuk payment callback
 * Endpoint ini dipanggil oleh payment gateway/provider ketika ada pembayaran
 * 
 * Security: 
 * - Verifikasi signature/secret dari provider
 * - Validasi data pembayaran
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log webhook untuk debugging
    console.log('📥 Webhook received:', JSON.stringify(body, null, 2));

    // Contoh struktur payload dari payment provider:
    // {
    //   order_id: "uuid-order",
    //   transaction_id: "dana-transaction-id",
    //   status: "success" | "failed" | "pending",
    //   amount: 10000,
    //   signature: "hmac-sha256-signature"
    // }

    const { order_id, transaction_id, status, amount, signature } = body;

    // Validasi required fields
    if (!order_id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: order_id, status' },
        { status: 400 }
      );
    }

    // TODO: Verifikasi signature dari payment provider
    // const expectedSignature = crypto
    //   .createHmac('sha256', process.env.PAYMENT_WEBHOOK_SECRET || '')
    //   .update(JSON.stringify(body))
    //   .digest('hex');
    // 
    // if (signature !== expectedSignature) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database tidak terkonfigurasi' },
        { status: 500 }
      );
    }

    // Cek order exists
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        { error: 'Order tidak ditemukan' },
        { status: 404 }
      );
    }

    // Map status dari provider ke status di database
    const statusMap: Record<string, 'pending' | 'berhasil' | 'gagal' | 'expired'> = {
      'success': 'berhasil',
      'failed': 'gagal',
      'pending': 'pending',
      'settlement': 'berhasil',
      'capture': 'berhasil',
      'deny': 'gagal',
      'cancel': 'gagal',
      'expire': 'expired',
    };

    const dbStatus = statusMap[status.toLowerCase()];
    
    if (!dbStatus) {
      console.warn(`Unknown payment status: ${status}`);
      return NextResponse.json(
        { error: `Unknown status: ${status}` },
        { status: 400 }
      );
    }

    // Update order status
    const updateData: any = {
      status: dbStatus,
    };

    if (transaction_id) {
      updateData.dana_transaction_id = transaction_id;
    }

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', order_id);

    if (updateError) {
      console.error('Error updating order:', updateError);
      return NextResponse.json(
        { error: 'Failed to update order status' },
        { status: 500 }
      );
    }

    console.log(`✅ Order ${order_id} updated: ${dbStatus}`);

    return NextResponse.json({
      success: true,
      message: `Order status updated to ${dbStatus}`,
      order_id,
      new_status: dbStatus,
    });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handler untuk GET request (testing/documentation)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Payment webhook endpoint',
    usage: 'POST to this endpoint with payment callback data',
    expectedPayload: {
      order_id: 'string (required)',
      transaction_id: 'string (optional)',
      status: 'success | failed | pending | settlement | capture | deny | cancel | expire',
      amount: 'number (optional)',
      signature: 'string (optional, for verification)',
    },
  });
}
