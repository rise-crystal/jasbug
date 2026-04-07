-- ========================================
-- Migration: Recreate Orders Table dengan Status Baru
-- Date: 2026-04-07
-- Description: Buat ulang tabel orders dari awal dengan status 
--              pending_pembayaran & pending_konfirmasi_admin
-- ========================================

-- ========================================
-- LANGSUNG DROP & CREATE (TIDAK PERLU BACKUP)
-- ========================================

-- Hapus tabel lama (ini akan otomatis hapus semua trigger, function, constraint)
DROP TABLE IF EXISTS orders CASCADE;

-- Hapus function (jika masih ada)
DROP FUNCTION IF EXISTS generate_order_id() CASCADE;

-- ========================================
-- BUAT TABEL BARU
-- ========================================
CREATE TABLE orders (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Data Order
  phone_number VARCHAR(20) NOT NULL,
  product_id VARCHAR(50),
  
  -- Status (dengan constraint yang benar)
  status VARCHAR(30) NOT NULL DEFAULT 'pending_pembayaran',
  
  -- Payment
  dana_transaction_id VARCHAR(100),
  qris_string TEXT,
  payment_amount INTEGER,
  
  -- Payment Proof
  payment_proof_url TEXT,
  payment_proof_verified BOOLEAN DEFAULT FALSE,
  payment_proof_verified_at TIMESTAMP WITH TIME ZONE,
  payment_verified_by UUID,
  
  -- Custom ID
  custom_id VARCHAR(20) UNIQUE,
  
  -- Admin Verification Notes
  verification_notes TEXT,
  
  -- Bug Delivery
  bug_sent_at TIMESTAMP WITH TIME ZONE,
  bug_delivery_status VARCHAR(50) DEFAULT 'pending',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraint untuk status
  CONSTRAINT orders_status_check 
    CHECK (status IN (
      'pending_pembayaran', 
      'pending_konfirmasi_admin', 
      'berhasil', 
      'gagal', 
      'expired'
    ))
);

-- ========================================
-- BUAT FUNCTION & TRIGGER
-- ========================================
CREATE OR REPLACE FUNCTION generate_order_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.custom_id := 'SQID' || floor(random() * 10000000000000)::text;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_custom_id_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.custom_id IS NULL)
  EXECUTE FUNCTION generate_order_id();

-- ========================================
-- VERIFIKASI
-- ========================================

-- Cek struktur tabel
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- Cek constraint
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'orders'::regclass;

-- Cek trigger
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'orders';

-- Cek jumlah data (harus 0 karena tabel baru)
SELECT COUNT(*) as total_orders FROM orders;

-- ========================================
-- SELESAI! ✅
-- ========================================
-- 1. Tabel orders baru sudah dibuat
-- 2. Constraint status sudah benar (5 status valid)
-- 3. Trigger custom_id sudah aktif
-- 4. Tabel kosong, siap digunakan
-- 5. Test: Buat order baru → harus berhasil
-- ========================================
