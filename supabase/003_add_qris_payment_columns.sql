-- Add QRIS payment columns to orders table
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS qris_string TEXT,
  ADD COLUMN IF NOT EXISTS payment_amount INTEGER;

-- Add index for QRIS string (for faster lookups)
CREATE INDEX IF NOT EXISTS idx_orders_qris_string ON orders(qris_string) WHERE qris_string IS NOT NULL;

-- Add check constraint for payment amount
ALTER TABLE orders 
  ADD CONSTRAINT chk_payment_amount CHECK (payment_amount IS NULL OR payment_amount >= 0);
