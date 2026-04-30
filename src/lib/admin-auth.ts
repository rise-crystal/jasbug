import { NextRequest, NextResponse } from 'next/server';
import { hasValidAdminSession } from '@/lib/admin-session';

export async function requireAdminRequest(request: NextRequest): Promise<NextResponse | null> {
  const isAdmin = await hasValidAdminSession(request);

  if (isAdmin) {
    return null;
  }

  return NextResponse.json(
    { error: 'Unauthorized: admin session required' },
    { status: 401 }
  );
}
