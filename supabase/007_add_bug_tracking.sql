-- Tambah kolom untuk tracking pengiriman bug
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS bug_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS bug_delivery_status VARCHAR(50) DEFAULT 'pending';

-- Index untuk faster queries
CREATE INDEX IF NOT EXISTS idx_orders_bug_delivery ON orders(bug_delivery_status) WHERE bug_delivery_status IS NOT NULL;
