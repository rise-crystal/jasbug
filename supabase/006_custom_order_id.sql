-- Migration: Custom Order ID Format (SQID + 13 digit angka acak)
-- Contoh: SQID4829103847562, SQID9182736450192, dst

-- STEP 1: Tambah kolom baru untuk custom ID
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS custom_id VARCHAR(20) UNIQUE;

-- Bersihkan trigger/function lama agar migration aman dijalankan ulang
DROP TRIGGER IF EXISTS set_custom_id_trigger ON orders;
DROP FUNCTION IF EXISTS set_order_custom_id() CASCADE;
DROP FUNCTION IF EXISTS generate_order_id() CASCADE;

-- STEP 2: Buat function untuk generate ID acak
CREATE OR REPLACE FUNCTION generate_order_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  random_num TEXT;
  attempts INTEGER := 0;
  max_attempts INTEGER := 10;
BEGIN
  LOOP
    -- Generate 13 digit angka acak
    random_num := LPAD(FLOOR(RANDOM() * 10000000000000)::BIGINT::TEXT, 13, '0');
    
    -- Format: SQID + 13 digit acak
    new_id := 'SQID' || random_num;
    
    -- Cek apakah sudah ada yang pakai ID ini
    IF NOT EXISTS (SELECT 1 FROM orders WHERE custom_id = new_id) THEN
      RETURN new_id;
    END IF;
    
    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      -- Fallback: tambah timestamp jika collision berkali-kali
      new_id := 'SQID' || LPAD(FLOOR(RANDOM() * 10000000000000)::BIGINT::TEXT, 13, '0') || 
                EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT % 1000;
      RETURN new_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- STEP 3: Buat trigger untuk auto-generate ID saat INSERT
CREATE OR REPLACE FUNCTION set_order_custom_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate custom_id jika belum ada
  IF NEW.custom_id IS NULL THEN
    NEW.custom_id := generate_order_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Buat trigger baru
CREATE TRIGGER set_custom_id_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_custom_id();

-- STEP 4: Update existing orders dengan custom_id (jika ada data lama)
-- Generate ID acak untuk data lama
DO $$
DECLARE
  order_record RECORD;
BEGIN
  FOR order_record IN 
    SELECT id FROM orders 
    WHERE custom_id IS NULL AND id::TEXT ~ '^[0-9a-f-]+$'
  LOOP
    UPDATE orders 
    SET custom_id = generate_order_id()
    WHERE id = order_record.id;
  END LOOP;
END $$;

-- STEP 5: Buat index untuk faster lookup
CREATE INDEX IF NOT EXISTS idx_orders_custom_id ON orders(custom_id) WHERE custom_id IS NOT NULL;

-- SELESAI! Test dengan:
-- INSERT INTO orders (phone_number, status) VALUES ('081234567890', 'pending_pembayaran');
-- SELECT custom_id FROM orders ORDER BY created_at DESC LIMIT 1;
-- Hasil: SQID + 13 digit acak (contoh: SQID4829103847562)
