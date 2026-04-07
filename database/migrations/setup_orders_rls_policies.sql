-- ========================================
-- Setup RLS Policies untuk Tabel Orders
-- Date: 2026-04-07
-- Description: Setup Row Level Security policies 
--              agar admin bisa CRUD semua data
-- ========================================

-- ========================================
-- STEP 1: Aktifkan RLS
-- ========================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 2: Buat Policy untuk Admin (Service Role)
-- ========================================
-- Policy: Admin bisa SELECT semua orders
CREATE POLICY "Admin can view all orders"
  ON orders
  FOR SELECT
  USING (true);

-- Policy: Admin bisa INSERT orders
CREATE POLICY "Admin can insert orders"
  ON orders
  FOR INSERT
  WITH CHECK (true);

-- Policy: Admin bisa UPDATE orders
CREATE POLICY "Admin can update orders"
  ON orders
  FOR UPDATE
  USING (true);

-- Policy: Admin bisa DELETE orders
CREATE POLICY "Admin can delete orders"
  ON orders
  FOR DELETE
  USING (true);

-- ========================================
-- STEP 3: Buat Policy untuk Public (Client)
-- ========================================
-- Policy: Public bisa SELECT orders (untuk halaman /orders)
CREATE POLICY "Public can view orders"
  ON orders
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Public bisa INSERT orders (untuk buat order baru)
CREATE POLICY "Public can insert orders"
  ON orders
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- ========================================
-- STEP 4: Verifikasi Policies
-- ========================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;

-- ========================================
-- SELESAI! ✅
-- ========================================
-- Jika semua policy sudah dibuat, API seharusnya bisa CRUD orders
-- ========================================
