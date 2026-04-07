-- ========================================
-- Migration: Add Pending Pembayaran & Pending Konfirmasi Admin Status
-- Date: 2026-04-07
-- Description: Menambahkan status 'pending_pembayaran' dan 'pending_konfirmasi_admin' 
--              untuk memisahkan status pembayaran yang belum dibayar dengan yang sudah 
--              upload bukti tetapi menunggu verifikasi admin
-- 
-- CARA MENJALANKAN:
-- 1. Jalankan query diagnostik di bagian bawah file ini terlebih dahulu
--    untuk melihat semua status yang ada di database
-- 2. Jika ada status yang aneh, catat jumlahnya
-- 3. Jalankan migration ini
-- 4. Verifikasi hasil dengan query verifikasi di bagian bawah
-- ========================================

-- ========================================
-- QUERY DIAGNOSTIK (Jalankan ini SEBELUM migration)
-- ========================================
-- Lihat semua status yang ada di database saat ini:
-- SELECT status, COUNT(*) as jumlah FROM orders GROUP BY status ORDER BY status;

-- ========================================
-- MIGRATION UTAMA
-- ========================================

-- Langkah 1: Update semua status yang tidak dikenali ke 'pending_pembayaran'
-- Ini untuk menghindari constraint violation saat menambahkan CHECK constraint
UPDATE orders
SET status = 'pending_pembayaran'
WHERE status NOT IN ('pending', 'pending_pembayaran', 'pending_konfirmasi_admin', 'berhasil', 'gagal', 'expired');

-- Langkah 2: Update default value status dari 'pending' menjadi 'pending_pembayaran'
ALTER TABLE orders
  ALTER COLUMN status SET DEFAULT 'pending_pembayaran';

-- Langkah 3: Update semua data lama dengan status 'pending' menjadi 'pending_pembayaran'
UPDATE orders
SET status = 'pending_pembayaran'
WHERE status = 'pending';

-- Langkah 4: Tambahkan CHECK constraint untuk memvalidasi status yang diperbolehkan
-- Ini akan menolak nilai status yang tidak ada dalam daftar
ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending_pembayaran', 
    'pending_konfirmasi_admin', 
    'berhasil', 
    'gagal', 
    'expired'
  ));

-- Langkah 3: Update semua data lama dengan status 'pending' menjadi 'pending_pembayaran'
-- Ini untuk menjaga backward compatibility dengan data yang sudah ada
UPDATE orders
SET status = 'pending_pembayaran'
WHERE status = 'pending';

-- ========================================
-- VERIFIKASI (Jalankan ini SETELAH migration)
-- ========================================

-- Cek default value baru
SELECT column_name, column_default
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'status';

-- Cek constraint baru
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'orders'::regclass AND contype = 'c';

-- Lihat distribusi status setelah update (harus hanya ada 5 status valid)
SELECT status, COUNT(*) as count
FROM orders
GROUP BY status
ORDER BY status;

-- ========================================
-- TROUBLESHOOTING
-- ========================================
-- Jika masih error saat menjalankan migration:
-- 
-- 1. Cek status apa saja yang ada di database:
--    SELECT DISTINCT status FROM orders;
--
-- 2. Jika ada status yang tidak biasa, update manual ke status yang benar:
--    UPDATE orders SET status = 'pending_pembayaran' WHERE status = '<status_aneh>';
--
-- 3. Jalankan ulang migration dari awal
-- ========================================

-- ========================================
-- Catatan Penting
-- ========================================
-- 1. Migration ini mengasumsikan bahwa semua order dengan status 'pending' 
--    yang belum ada bukti pembayaran adalah 'pending_pembayaran'
-- 
-- 2. Jika ada order dengan status 'pending' yang sebenarnya sudah upload bukti,
--    Anda perlu manually update statusnya ke 'pending_konfirmasi_admin':
--
--    UPDATE orders 
--    SET status = 'pending_konfirmasi_admin'
--    WHERE status = 'pending_pembayaran' 
--      AND payment_proof_url IS NOT NULL;
--
-- 3. Untuk rollback ke sistem lama, jalankan:
--
--    UPDATE orders SET status = 'pending' 
--    WHERE status IN ('pending_pembayaran', 'pending_konfirmasi_admin');
--    
--    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
--    
--    ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending';
