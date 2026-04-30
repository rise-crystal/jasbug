import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getPaymentExpiryState,
  getSafeJakartaNowMs,
  shouldAutoExpirePayment,
} from '@/lib/payment-expiry';

export const ORDER_LIST_SELECT =
  'id, custom_id, phone_number, status, product_id, payment_amount, payment_proof_url, payment_proof_verified, payment_proof_verified_at, created_at, bug_delivery_status, bug_sent_at';

export type PendingOrderRow = {
  id: string;
  custom_id?: string | null;
  created_at: string;
  status: string;
  payment_proof_url: string | null;
};

export type OrderListRow = {
  id: string;
  custom_id: string | null;
  phone_number: string;
  status: string;
  product_id: string | null;
  payment_amount: number | null;
  payment_proof_url: string | null;
  payment_proof_verified: boolean | null;
  payment_proof_verified_at: string | null;
  created_at: string;
  bug_delivery_status: string | null;
  bug_sent_at: string | null;
};

export type AutoExpireResult = {
  serverNowMs: number;
  expiredCount: number;
  expiredOrders: Array<{
    id: string;
    custom_id: string | null;
    created_at: string;
    previousStatus: string;
    newStatus: 'expired';
    minutesAgo: number;
    remainingMs: number;
  }>;
};

export async function autoExpirePendingOrders(
  supabaseAdmin: SupabaseClient,
  nowMs?: number,
  options?: {
    dryRun?: boolean;
  }
): Promise<AutoExpireResult> {
  const serverNowMs = nowMs ?? await getSafeJakartaNowMs();

  const { data: pendingOrders, error: fetchError } = await supabaseAdmin
    .from('orders')
    .select('id, custom_id, created_at, status, payment_proof_url')
    .eq('status', 'pending_pembayaran')
    .is('payment_proof_url', null)
    .order('created_at', { ascending: true });

  if (fetchError) {
    throw new Error(`Gagal mengambil order pending: ${fetchError.message}`);
  }

  const expiredOrders = ((pendingOrders || []) as PendingOrderRow[]).filter((order) =>
    shouldAutoExpirePayment(order, serverNowMs)
  );

  if (!options?.dryRun && expiredOrders.length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'expired' })
      .in('id', expiredOrders.map((order) => order.id));

    if (updateError) {
      throw new Error(`Gagal update status expired: ${updateError.message}`);
    }
  }

  return {
    serverNowMs,
    expiredCount: expiredOrders.length,
    expiredOrders: buildExpiredOrderSummaries(expiredOrders, serverNowMs),
  };
}

export async function fetchOrdersList(
  supabaseAdmin: SupabaseClient,
  options?: {
    pendingOnly?: boolean;
    sortAscending?: boolean;
  }
): Promise<OrderListRow[]> {
  let query = supabaseAdmin
    .from('orders')
    .select(ORDER_LIST_SELECT)
    .order('created_at', { ascending: Boolean(options?.sortAscending) });

  if (options?.pendingOnly) {
    query = query.in('status', ['pending_pembayaran', 'pending_konfirmasi_admin']);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Gagal mengambil daftar order: ${error.message}`);
  }

  return (data || []) as OrderListRow[];
}

function buildExpiredOrderSummaries(expiredOrders: PendingOrderRow[], nowMs: number) {
  return expiredOrders.map((order) => ({
    id: order.id,
    custom_id: order.custom_id ?? null,
    created_at: order.created_at,
    previousStatus: order.status,
    newStatus: 'expired' as const,
    minutesAgo: Math.floor((nowMs - new Date(order.created_at).getTime()) / 60000),
    remainingMs: Math.max(0, getPaymentExpiryState(order.created_at, nowMs).remainingMs),
  }));
}
