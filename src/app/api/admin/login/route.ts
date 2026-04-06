import { NextRequest, NextResponse } from 'next/server';

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

    // Set cookie untuk session (valid 24 jam)
    response.cookies.set('admin_session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

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
  const session = request.cookies.get('admin_session')?.value;
  
  if (session === 'authenticated') {
    return NextResponse.json({ authenticated: true });
  }
  
  return NextResponse.json({ authenticated: false });
}

export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: 'Logout berhasil',
  });

  response.cookies.set('admin_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });

  return response;
}
