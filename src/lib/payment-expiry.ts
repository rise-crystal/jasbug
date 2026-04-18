export const timeApiUrl = 'https://timeapi.io/api/Time/current/zone?timeZone=Asia/Jakarta';
export const PAYMENT_TIMEOUT_MS = 5 * 60 * 1000;

const JAKARTA_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

interface JakartaTimeApiResponse {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  seconds: number;
  milliSeconds: number;
  dateTime: string;
  date: string;
  time: string;
  timeZone: string;
  dayOfWeek: string;
  dstActive: boolean;
}

export interface ExpirablePaymentOrder {
  id: string;
  status: string;
  created_at: string;
  payment_proof_url: string | null;
}

export interface PaymentExpiryState {
  createdAtMs: number;
  expiresAtMs: number;
  remainingMs: number;
  isExpired: boolean;
}

export function getPaymentExpiryState(createdAt: string, nowMs: number): PaymentExpiryState {
  const createdAtMs = new Date(createdAt).getTime();
  const expiresAtMs = createdAtMs + PAYMENT_TIMEOUT_MS;
  const remainingMs = expiresAtMs - nowMs;

  return {
    createdAtMs,
    expiresAtMs,
    remainingMs,
    isExpired: remainingMs <= 0,
  };
}

export function shouldAutoExpirePayment(order: ExpirablePaymentOrder, nowMs: number): boolean {
  if (order.status !== 'pending_pembayaran' || order.payment_proof_url) {
    return false;
  }

  const expiryState = getPaymentExpiryState(order.created_at, nowMs);
  return expiryState.isExpired;
}

export function parseJakartaNowMs(payload: Partial<JakartaTimeApiResponse>): number {
  if (
    typeof payload.year !== 'number' ||
    typeof payload.month !== 'number' ||
    typeof payload.day !== 'number' ||
    typeof payload.hour !== 'number' ||
    typeof payload.minute !== 'number' ||
    typeof payload.seconds !== 'number'
  ) {
    throw new Error('Invalid timeapi.io response');
  }

  return (
    Date.UTC(
      payload.year,
      payload.month - 1,
      payload.day,
      payload.hour,
      payload.minute,
      payload.seconds,
      payload.milliSeconds ?? 0
    ) - JAKARTA_UTC_OFFSET_MS
  );
}

export async function fetchJakartaNowMs(fetchImpl: typeof fetch = fetch): Promise<number> {
  const response = await fetchImpl(timeApiUrl, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`timeapi.io returned ${response.status}`);
  }

  const payload = (await response.json()) as Partial<JakartaTimeApiResponse>;
  return parseJakartaNowMs(payload);
}

export async function getSafeJakartaNowMs(fetchImpl: typeof fetch = fetch): Promise<number> {
  try {
    return await fetchJakartaNowMs(fetchImpl);
  } catch (error) {
    console.error('Failed to fetch Jakarta time from timeapi.io, using local fallback:', error);
    return Date.now();
  }
}
