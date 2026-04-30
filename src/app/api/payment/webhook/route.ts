import crypto from 'node:crypto';
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
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return NextResponse.json(
        { error: 'PAYMENT_WEBHOOK_SECRET belum dikonfigurasi' },
        { status: 500 }
      );
    }

    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    // Contoh struktur payload dari payment provider:
    // {
    //   order_id: "uuid-order",
    //   transaction_id: "dana-transaction-id",
    //   status: "success" | "failed" | "pending",
    //   amount: 10000,
    //   signature: "hmac-sha256-signature"
    // }

    const { order_id, transaction_id, status, amount, signature } = body;
    const receivedSignature =
      request.headers.get('x-signature') ||
      request.headers.get('x-webhook-signature') ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      (typeof signature === 'string' ? signature : null);

    // Validasi required fields
    if (!order_id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: order_id, status' },
        { status: 400 }
      );
    }

    if (!receivedSignature) {
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 401 }
      );
    }

    const bodyWithoutSignature =
      body && typeof body === 'object' && !Array.isArray(body)
        ? Object.fromEntries(Object.entries(body).filter(([key]) => key !== 'signature'))
        : body;

    const normalizedSignature = receivedSignature.replace(/^sha256=/i, '');

    if (
      !matchesWebhookSignature(normalizedSignature, rawBody, webhookSecret) &&
      !matchesWebhookSignature(normalizedSignature, JSON.stringify(bodyWithoutSignature), webhookSecret)
    ) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    console.log('📥 Verified webhook received for order:', order_id);

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
    const statusMap: Record<string, 'pending_pembayaran' | 'pending_konfirmasi_admin' | 'berhasil' | 'gagal' | 'expired'> = {
      'success': 'berhasil',
      'failed': 'gagal',
      'pending': 'pending_pembayaran',
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

function matchesWebhookSignature(signature: string, content: string, secret: string): boolean {
  const digest = crypto.createHmac('sha256', secret).update(content).digest();
  const candidates = [digest.toString('hex'), digest.toString('base64')];

  return candidates.some(candidate => safeCompareStrings(signature, candidate));
}

function safeCompareStrings(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
