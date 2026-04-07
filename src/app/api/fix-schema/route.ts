import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * API untuk menambahkan kolom yang hilang ke tabel orders
 * Endpoint ini hanya untuk development/initial setup
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database tidak terkonfigurasi' },
        { status: 500 }
      );
    }

    const results: string[] = [];
    const execSql = async (sql: string, successMessage: string, fallbackMessage: string) => {
      try {
        await supabaseAdmin.rpc('exec_sql', { sql });
        results.push(successMessage);
      } catch (e) {
        results.push(fallbackMessage);
      }
    };

    // Coba tambahkan kolom product_id jika belum ada
    await execSql(
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_id VARCHAR(50)',
      '✅ product_id column added',
      'ℹ️ product_id akan ditambahkan via migration'
    );

    // Coba tambahkan kolom qris_string jika belum ada
    await execSql(
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS qris_string TEXT',
      '✅ qris_string column added',
      'ℹ️ qris_string akan ditambahkan via migration'
    );

    // Coba tambahkan kolom payment_amount jika belum ada
    await execSql(
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_amount INTEGER',
      '✅ payment_amount column added',
      'ℹ️ payment_amount akan ditambahkan via migration'
    );

    // Perbaiki kolom status agar muat nilai pending_konfirmasi_admin
    await execSql(
      'ALTER TABLE orders ALTER COLUMN status TYPE VARCHAR(30)',
      '✅ status column widened to VARCHAR(30)',
      'ℹ️ status column width akan diperbaiki via migration'
    );

    await execSql(
      "ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending_pembayaran'",
      '✅ status default updated to pending_pembayaran',
      'ℹ️ status default akan diperbarui via migration'
    );

    await execSql(
      'ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check',
      '✅ old orders_status_check constraint dropped',
      'ℹ️ orders_status_check lama akan dihapus via migration'
    );

    await execSql(
      "ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending_pembayaran', 'pending_konfirmasi_admin', 'berhasil', 'gagal', 'expired'))",
      '✅ orders_status_check constraint updated',
      'ℹ️ orders_status_check baru akan ditambahkan via migration'
    );

    return NextResponse.json({
      success: true,
      message: 'Schema fix attempts completed',
      results,
      note: 'For production, run migration files directly in Supabase Dashboard',
    });
  } catch (error) {
    console.error('Fix schema error:', error);
    return NextResponse.json(
      { 
        error: 'Gagal memperbaiki schema',
        note: 'Jalankan migration SQL manual di Supabase Dashboard'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Fix schema endpoint',
    usage: 'POST to this endpoint to add missing columns and fix status schema',
    migrations: [
      'supabase/003_add_qris_payment_columns.sql',
      'supabase/004_add_product_id_column.sql',
      'supabase/008_fix_order_status_column_length.sql',
    ],
  });
}
