# Custom Order ID Format - SQID + Random 13 Digit

## 🎯 Gambaran Umum
Order ID sekarang menggunakan format custom: **SQID** + **13 digit angka acak**.

### Contoh Format:
```
SQID4829103847562
SQID9182736450192
SQID3746251849302
SQID8273645192837
```

**Keuntungan:**
- ✅ Tidak bisa ditebak (unpredictable)
- ✅ Tidak sequential (privacy lebih baik)
- ✅ Tetap mudah dibaca dan di-share

## 📋 Setup Database

### WAJIB JALANKAN di Supabase SQL Editor:

**File:** `supabase/006_custom_order_id.sql`

**Cara:**
1. Buka: https://app.supabase.com → Project → SQL Editor
2. Copy-paste SEMUA isi file `supabase/006_custom_order_id.sql`
3. Klik **Run**
4. ✅ Selesai!

### Apa yang Dilakukan Migration Ini:

```sql
-- 1. Tambah kolom custom_id
ALTER TABLE orders ADD COLUMN custom_id VARCHAR(20) UNIQUE;

-- 2. Buat function generate ID acak
CREATE FUNCTION generate_order_id() → Returns 'SQID' + 13 digit random

-- Cara kerja function:
- Generate 13 digit angka random (0000000000000 - 9999999999999)
- Cek apakah sudah ada yang pakai (collision check)
- Jika ada → Generate ulang (max 10x)
- Jika masih collision → Tambah timestamp suffix

-- 3. Buat trigger auto-generate saat INSERT
CREATE TRIGGER set_custom_id_trigger BEFORE INSERT ON orders

-- 4. Update data lama (jika ada) dengan ID acak baru
UPDATE orders SET custom_id = generate_order_id() WHERE custom_id IS NULL;
```

## 🔧 Cara Kerja

### Saat INSERT Order Baru:

```typescript
// Di kode Anda (actions.ts):
const { data: order } = await supabase
  .from('orders')
  .insert({ phone_number: '081234567890', status: 'pending' })
  .select()
  .single();

// Database otomatis generate custom_id acak:
// order.custom_id = 'SQID4829103847562' (random!)
// order.custom_id = 'SQID9182736450192' (random!)
// order.custom_id = 'SQID3746251849302' (random!)
```

### Trigger Flow:

```
INSERT order baru
       ↓
Trigger BEFORE INSERT aktif
       ↓
Function set_custom_id() dipanggil
       ↓
Cek: custom_id NULL? → Ya
       ↓
LOOP:
  - Generate 13 digit random (0000000000000-9999999999999)
  - Format: 'SQID' + random_number
  - Cek: Sudah ada yang pakai? 
    - YA  → Generate ulang (max 10x)
    - TIDAK → Return ID baru
       ↓
Jika collision > 10x → Fallback: tambah timestamp suffix
       ↓
Simpan ke kolom custom_id
```

### Collision Handling:

```typescript
// Kemungkinan collision sangat kecil:
// Total kemungkinan: 10^13 = 10,000,000,000,000 (10 triliun)
// 
// Dengan 1 juta orders:
// Probability collision ≈ 0.00001% (sangat kecil!)
// 
// Fallback ada timestamp suffix jika somehow collision berulang
```

## 💻 Penggunaan di Kode

### API Endpoints (Support Both UUID & Custom ID):

Semua API sekarang bisa menerima **UUID lama** ATAU **Custom ID baru**:

```typescript
// Bisa pakai UUID lama:
/api/payment/status/550e8400-e29b-41d4-a716-446655440000

// Atau custom ID baru:
/api/payment/status/SQID0000000000001
```

Query yang digunakan:
```typescript
.or(`id.eq.${orderId},custom_id.eq.${orderId}`)
```

### Display di UI:

```tsx
// Orders page & Admin page
<span>ID: {order.custom_id || order.id}</span>

// Jika ada custom_id → Tampilkan: SQID0000000000001
// Jika tidak → Fallback ke UUID lama
```

## 🎨 Tampilan di UI

### Sebelum (UUID):
```
ID: 550e8400-e29b-41d4-a716-446655440000
```

### Sesudah (Custom ID):
```
ID: SQID0000000000001
```

**Styling:**
- Warna: Orange (`text-orange-400`)
- Background: Dark gray dengan border orange
- Font: Monospace + Bold
- Lebih mudah dibaca dan di-share

## 📊 Test Manual

### 1. Test Insert Order Baru

Di SQL Editor Supabase:

```sql
-- Insert order manual
INSERT INTO orders (phone_number, status) 
VALUES ('081234567890', 'pending');

-- Cek custom_id yang ter-generate (akan random!)
SELECT custom_id, phone_number, status 
FROM orders 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Result (contoh):**
```
custom_id          | phone_number | status
-------------------+--------------+--------
SQID4829103847562  | 081234567890 | pending
SQID9182736450192  | 089876543210 | pending
SQID3746251849302  | 081122334455 | pending
```

**Setiap insert akan menghasilkan ID yang berbeda dan tidak bisa ditebak!**

### 2. Test Via Aplikasi

```bash
# 1. Jalankan dev server
npm run dev

# 2. Buat order dari halaman utama (/)
# 3. Buka /orders
# 4. Lihat format ID baru: SQID000000000000X
```

### 3. Test API dengan Custom ID

```bash
# Test status check dengan custom ID
curl http://localhost:3000/api/payment/status/SQID0000000000001

# Test upload proof dengan custom ID
curl -X POST http://localhost:3000/api/payment/upload-proof \
  -F "file=@bukti.jpg" \
  -F "orderId=SQID0000000000001"
```

## 🔄 Migration Data Lama

Jika sudah ada order dengan UUID, migration akan otomatis convert:

```sql
-- Sebelum migration:
id (UUID)                              | custom_id
---------------------------------------+----------
550e8400-e29b-41d4-a716-446655440000   | NULL

-- Sesudah migration:
id (UUID)                              | custom_id
---------------------------------------+------------------
550e8400-e29b-41d4-a716-446655440000   | SQID0000000000001
```

**Note:** Data lama tetap punya UUID asli, tapi sekarang ada custom_id juga.

## ⚙️ Konfigurasi Format

### Ubah Prefix (SQID → Lain):

Edit file: `supabase/006_custom_order_id.sql`

```sql
-- Ganti 'SQID' dengan prefix lain:
new_id := 'ORDER' || LPAD(seq_num::TEXT, 13, '0');
-- Hasil: ORDER0000000000001
```

### Ubah Jumlah Digit Angka:

```sql
-- Ganti 13 dengan jumlah digit yang diinginkan:
new_id := 'SQID' || LPAD(seq_num::TEXT, 10, '0');
-- Hasil: SQID0000000001 (10 digit)
```

### Reset Random Generator:
```sql
-- Tidak perlu reset karena random setiap saat
-- Tapi jika ingin regenerate ID yang sudah ada:
UPDATE orders 
SET custom_id = NULL 
WHERE custom_id = 'SQID_YANG_MAUDIGANTI';

-- Trigger akan otomatis generate ID baru saat next update
```

### Force Regenerate ID:
```sql
-- Generate ulang ID untuk order tertentu
UPDATE orders 
SET custom_id = NULL 
WHERE custom_id = 'SQID4829103847562';

-- Update lagi untuk trigger ID baru
UPDATE orders 
SET phone_number = phone_number 
WHERE custom_id IS NULL;
```

## 🐛 Troubleshooting

### Error: "duplicate key value violates unique constraint"
```
Penyebab: Random collision (sangat jarang!)
Solusi: Function akan auto-retry max 10x

Jika masih error:
-- Cek apakah function collision check bekerja
SELECT * FROM orders WHERE custom_id LIKE 'SQID4829%';

-- Manual generate ID dengan timestamp suffix
UPDATE orders 
SET custom_id = 'SQID' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT % 10000000000000
WHERE custom_id IS NULL;
```

### Custom ID tidak ter-generate
```
1. Cek trigger ada:
SELECT * FROM pg_trigger WHERE tgname = 'set_custom_id_trigger';

2. Cek function ada:
SELECT * FROM pg_proc WHERE proname = 'generate_order_id';

3. Test function manual:
SELECT generate_order_id();
-- Harus return: SQID + 13 digit random

4. Jika ada yang hilang, jalankan ulang migration
```

### Data lama tidak ter-convert
```
-- Manual update:
UPDATE orders 
SET custom_id = 'SQID' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 13, '0')
WHERE custom_id IS NULL;
```

## 📝 File yang Diubah

### Baru:
- `supabase/006_custom_order_id.sql` - Migration custom ID

### Diubah:
- `src/app/orders/page.tsx` - Interface & UI tampilkan custom_id
- `src/app/admin/page.tsx` - Interface & UI tampilkan custom_id
- `src/app/api/payment/qris/route.ts` - Query support custom_id
- `src/app/api/payment/status/[orderId]/route.ts` - Query support custom_id
- `src/app/api/payment/upload-proof/route.ts` - Query support custom_id
- `src/app/api/payment/verify/[orderId]/route.ts` - Query support custom_id

## ✅ Checklist Setup

```
[ ] 1. Jalankan migration SQL di Supabase
[ ] 2. Test insert order baru → custom_id ter-generate
[ ] 3. Test tampil di /orders → Format SQIDXXXXXXXXXXXXX
[ ] 4. Test tampil di /admin → Format SQIDXXXXXXXXXXXXX
[ ] 5. Test API dengan custom ID → Berhasil
[ ] 6. (Opsional) Reset sequence ke angka yang diinginkan
```

## 🎉 Keuntungan Custom ID

✅ **Lebih mudah dibaca** vs UUID
✅ **Lebih mudah di-share** ke customer
✅ **Auto-increment** → Urut berdasarkan waktu
✅ **Profesional** → Format seperti sistem enterprise
✅ **Backward compatible** → Masih support UUID lama
✅ **Flexible** → Bisa customize prefix & format

---

## ⚡ Quick Start

```bash
# 1. Setup Database
# Jalankan: supabase/006_custom_order_id.sql di SQL Editor

# 2. Run App
npm run dev

# 3. Test
# Buat order baru → Lihat ID: SQID0000000000001
```

**Selesai! Order ID sekarang menggunakan format SQID!** 🚀
