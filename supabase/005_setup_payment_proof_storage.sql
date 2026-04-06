-- Setup Supabase Storage untuk bukti pembayaran
-- Jalankan di SQL Editor Supabase

-- 1. Buat Storage Bucket (via SQL)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  true, -- Public agar bisa dilihat admin
  5242880, -- 5MB max
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Setup RLS Policies untuk Storage Bucket
-- Allow anyone to upload (public upload)
CREATE POLICY "Allow public upload to payment-proofs"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'payment-proofs');

-- Allow anyone to view (public read)
CREATE POLICY "Allow public read from payment-proofs"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'payment-proofs');

-- Allow authenticated users to delete (admin)
CREATE POLICY "Allow admin delete payment-proofs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'payment-proofs');

-- 3. Tambah kolom payment_proof di tabel orders
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_proof_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payment_proof_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS payment_verified_by UUID;

-- 4. Index untuk faster queries
CREATE INDEX IF NOT EXISTS idx_orders_payment_proof ON orders(payment_proof_url) WHERE payment_proof_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_unverified ON orders(payment_proof_url) WHERE payment_proof_url IS NOT NULL AND payment_proof_verified = FALSE;
