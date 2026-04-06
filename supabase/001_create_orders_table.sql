-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  product_id VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending' NOT NULL,
  dana_transaction_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_phone_number ON orders(phone_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

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
