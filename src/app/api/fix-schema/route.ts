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

    // Coba tambahkan kolom product_id jika belum ada
    try {
      await supabaseAdmin.rpc('exec_sql', { 
        sql: 'ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_id VARCHAR(50)' 
      });
      results.push('✅ product_id column added');
    } catch (e) {
      // RPC might not exist, try direct query
      results.push('ℹ️ Using Supabase REST API - column will be added via migration');
    }

    // Coba tambahkan kolom qris_string jika belum ada
    try {
      await supabaseAdmin.rpc('exec_sql', { 
        sql: 'ALTER TABLE orders ADD COLUMN IF NOT EXISTS qris_string TEXT' 
      });
      results.push('✅ qris_string column added');
    } catch (e) {
      results.push('ℹ️ qris_string will be added via migration');
    }

    // Coba tambahkan kolom payment_amount jika belum ada
    try {
      await supabaseAdmin.rpc('exec_sql', { 
        sql: 'ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_amount INTEGER' 
      });
      results.push('✅ payment_amount column added');
    } catch (e) {
      results.push('ℹ️ payment_amount will be added via migration');
    }

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
    usage: 'POST to this endpoint to add missing columns',
    migrations: [
      'supabase/003_add_qris_payment_columns.sql',
      'supabase/004_add_product_id_column.sql',
    ],
  });
}
