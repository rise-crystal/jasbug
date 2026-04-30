import { NextRequest, NextResponse } from 'next/server';
import {
  createAdminSessionToken,
  getAdminSessionCookieName,
  getAdminSessionCookieOptions,
  hasValidAdminSession,
} from '@/lib/admin-session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password diperlukan' },
        { status: 400 }
      );
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
      return NextResponse.json(
        { error: 'Admin password tidak terkonfigurasi' },
        { status: 500 }
      );
    }

    // Simple password check
    if (password !== adminPassword) {
      return NextResponse.json(
        { error: 'Password salah' },
        { status: 401 }
      );
    }

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      message: 'Login berhasil',
    });

    const { token, expiresAt } = await createAdminSessionToken();

    response.cookies.set(
      getAdminSessionCookieName(),
      token,
      getAdminSessionCookieOptions(expiresAt)
    );

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  if (await hasValidAdminSession(request)) {
    return NextResponse.json({ authenticated: true });
  }
  
  return NextResponse.json({ authenticated: false });
}

export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: 'Logout berhasil',
  });

  response.cookies.set(getAdminSessionCookieName(), '', {
    ...getAdminSessionCookieOptions(new Date(0)),
    maxAge: 0,
  });

  return response;
}
