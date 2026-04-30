import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { hasValidAdminSession } from '@/lib/admin-session';

// Simple in-memory rate limiter (untuk production gunakan Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = 100; // requests
const RATE_WINDOW = 15 * 60 * 1000; // 15 minutes in ms

function getRateLimitKey(request: NextRequest): string {
  // Use IP address as key
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  return `ratelimit:${ip}`;
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const limit = rateLimitMap.get(key);

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }

  if (limit.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  limit.count++;
  return { allowed: true, remaining: RATE_LIMIT - limit.count };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let apiResponse: NextResponse | null = null;

  // Rate limiting untuk semua API routes
  if (pathname.startsWith('/api/')) {
    const key = getRateLimitKey(request);
    const { allowed, remaining } = checkRateLimit(key);

    if (!allowed) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(RATE_WINDOW / 1000) 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil(RATE_WINDOW / 1000).toString(),
            'X-RateLimit-Limit': RATE_LIMIT.toString(),
            'X-RateLimit-Remaining': '0',
          }
        }
      );
    }

    // Add rate limit headers
    apiResponse = NextResponse.next();
    apiResponse.headers.set('X-RateLimit-Limit', RATE_LIMIT.toString());
    apiResponse.headers.set('X-RateLimit-Remaining', remaining.toString());
    
    // Security: Remove server header
    apiResponse.headers.delete('x-powered-by');
  }

  const isAdminPage = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isProtectedAdminApi =
    pathname === '/api/fix-schema' ||
    pathname.startsWith('/api/payment/verify/') ||
    (pathname.startsWith('/api/payment/status/') && request.method !== 'GET');

  if (!isAdminPage && !isProtectedAdminApi) {
    return apiResponse ?? NextResponse.next();
  }

  const isAdmin = await hasValidAdminSession(request);

  if (isAdmin) {
    return apiResponse ?? NextResponse.next();
  }

  if (isProtectedAdminApi) {
    return NextResponse.json(
      { error: 'Unauthorized: admin session required' },
      { status: 401 }
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/admin/login';
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
