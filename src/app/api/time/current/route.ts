import { NextResponse } from 'next/server';
import { getSafeJakartaTimeSnapshot } from '@/lib/payment-expiry';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snapshot = await getSafeJakartaTimeSnapshot();

    return NextResponse.json({
      success: true,
      ...snapshot,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Gagal mengambil waktu realtime',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
