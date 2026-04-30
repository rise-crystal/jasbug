const ADMIN_SESSION_COOKIE = 'admin_session';
const ADMIN_SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

interface AdminSessionPayload {
  role: 'admin';
  exp: number;
  iat: number;
  nonce: string;
}

type RequestWithCookies = {
  cookies: {
    get(name: string): { value: string } | undefined;
  };
};

function getAdminSessionSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || null;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function signPayload(payload: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return new Uint8Array(signature);
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let result = 0;

  for (let index = 0; index < left.length; index++) {
    result |= left[index] ^ right[index];
  }

  return result === 0;
}

function parsePayload(value: string): AdminSessionPayload | null {
  try {
    const decoded = decoder.decode(fromBase64Url(value));
    const payload = JSON.parse(decoded) as Partial<AdminSessionPayload>;

    if (
      payload.role !== 'admin' ||
      typeof payload.exp !== 'number' ||
      typeof payload.iat !== 'number' ||
      typeof payload.nonce !== 'string'
    ) {
      return null;
    }

    return payload as AdminSessionPayload;
  } catch {
    return null;
  }
}

export async function createAdminSessionToken(): Promise<{ token: string; expiresAt: Date }> {
  const secret = getAdminSessionSecret();

  if (!secret) {
    throw new Error('Admin session secret is not configured');
  }

  const expiresAt = new Date(Date.now() + ADMIN_SESSION_DURATION_MS);
  const payload: AdminSessionPayload = {
    role: 'admin',
    exp: expiresAt.getTime(),
    iat: Date.now(),
    nonce: crypto.randomUUID(),
  };

  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await signPayload(encodedPayload, secret);

  return {
    token: `${encodedPayload}.${toBase64Url(signature)}`,
    expiresAt,
  };
}

export async function verifyAdminSessionToken(token: string | null | undefined): Promise<boolean> {
  if (!token) {
    return false;
  }

  const secret = getAdminSessionSecret();

  if (!secret) {
    return false;
  }

  const [encodedPayload, encodedSignature, extraPart] = token.split('.');

  if (!encodedPayload || !encodedSignature || extraPart) {
    return false;
  }

  const payload = parsePayload(encodedPayload);

  if (!payload || payload.exp <= Date.now()) {
    return false;
  }

  try {
    const expectedSignature = await signPayload(encodedPayload, secret);
    const actualSignature = fromBase64Url(encodedSignature);

    return timingSafeEqual(actualSignature, expectedSignature);
  } catch {
    return false;
  }
}

export async function hasValidAdminSession(request: RequestWithCookies): Promise<boolean> {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionToken(token);
}

export function getAdminSessionCookieName(): string {
  return ADMIN_SESSION_COOKIE;
}

export function getAdminSessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    expires: expiresAt,
    path: '/',
  };
}
