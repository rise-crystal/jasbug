-- ========================================
-- Migration: Add Expired Status to Orders
-- Date: 2026-04-07
-- Description: Menambahkan status 'expired' sebagai status valid untuk order
-- ========================================

-- Jika menggunakan ENUM type (PostgreSQL):
-- ALTER TYPE order_status ADD VALUE 'expired';

-- Jika menggunakan CHECK constraint (PostgreSQL):
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'berhasil', 'gagal', 'expired'));

-- Jika menggunakan MySQL:
-- ALTER TABLE orders
--   DROP CHECK orders_status_check;
-- 
-- ALTER TABLE orders
--   ADD CONSTRAINT orders_status_check 
--   CHECK (status IN ('pending', 'berhasil', 'gagal', 'expired'));

-- Verifikasi perubahan
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE table_name = 'orders' AND constraint_name = 'orders_status_check';

-- Test: Update beberapa order pending yang sudah expired (> 5 menit) ke status expired
-- Uncomment jika ingin menjalankan update otomatis:
/*
UPDATE orders
SET status = 'expired', updated_at = NOW()
WHERE status = 'pending'
  AND payment_proof_url IS NULL
  AND created_at < NOW() - INTERVAL '5 minutes';
*/
