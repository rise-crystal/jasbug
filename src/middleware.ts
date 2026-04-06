import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', RATE_LIMIT.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    
    // Security: Remove server header
    response.headers.delete('x-powered-by');
    
    return response;
  }

  // Allow login page without redirect
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // Check admin pages
  if (pathname.startsWith('/admin')) {
    const session = request.cookies.get('admin_session')?.value;
    
    if (session !== 'authenticated') {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/admin/login';
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
