-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  product_id VARCHAR(50),
  status VARCHAR(30) DEFAULT 'pending_pembayaran' NOT NULL,
  dana_transaction_id VARCHAR(100),
  qris_string TEXT,
  payment_amount INTEGER,
  payment_proof_url TEXT,
  payment_proof_verified BOOLEAN DEFAULT FALSE,
  payment_proof_verified_at TIMESTAMP WITH TIME ZONE,
  payment_verified_by UUID,
  custom_id VARCHAR(20),
  verification_notes TEXT,
  bug_sent_at TIMESTAMP WITH TIME ZONE,
  bug_delivery_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_phone_number ON orders(phone_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_custom_id ON orders(custom_id) WHERE custom_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_payment_proof ON orders(payment_proof_url) WHERE payment_proof_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_bug_delivery ON orders(bug_delivery_status) WHERE bug_delivery_status IS NOT NULL;

-- Enable Row Level Security (RLS)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for service role
-- (In production, create more restrictive policies)
CREATE POLICY "Allow all operations for service role" ON orders
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create policy for public read access (optional - adjust based on your needs)
CREATE POLICY "Allow public read access" ON orders
  FOR SELECT
  USING (true);

-- Enable realtime for the orders table
-- Run this in Supabase dashboard or via API:
-- ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Function to automatically notify on order changes
CREATE OR REPLACE FUNCTION notify_order_changes()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'order_changes',
    json_build_object(
      'operation', TG_OP,
      'record', row_to_json(NEW),
      'old_record', row_to_json(OLD)
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order changes
CREATE TRIGGER order_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_changes();
