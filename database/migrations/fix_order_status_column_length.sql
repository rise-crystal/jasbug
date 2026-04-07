-- Migration: Fix Orders Status Column Length
-- Description: Memperbesar kolom status agar muat nilai
--              'pending_konfirmasi_admin'

ALTER TABLE orders
ALTER COLUMN status TYPE VARCHAR(30);

ALTER TABLE orders
ALTER COLUMN status SET DEFAULT 'pending_pembayaran';

ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
ADD CONSTRAINT orders_status_check
CHECK (status IN (
  'pending_pembayaran',
  'pending_konfirmasi_admin',
  'berhasil',
  'gagal',
  'expired'
));
