# Cara Memperbaiki Error Database

## Error: "Could not find the 'product_id' column"

Database Anda belum memiliki kolom `product_id`, `qris_string`, dan `payment_amount` di tabel `orders`.

## Solusi (PILIH SALAH SATU):

### Opsi 1: Jalankan via Supabase Dashboard (RECOMMENDED) ⭐

1. Buka **Supabase Dashboard**: https://app.supabase.com
2. Pilih project Anda
3. Klik **SQL Editor** di sidebar kiri
4. **Copy-paste dan jalankan** SQL berikut satu per satu:

#### Migration 1: Tambah kolom product_id
```sql
-- File: supabase/004_add_product_id_column.sql
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS product_id VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id) WHERE product_id IS NOT NULL;
```

#### Migration 2: Tambah kolom QRIS payment
```sql
-- File: supabase/003_add_qris_payment_columns.sql
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS qris_string TEXT,
  ADD COLUMN IF NOT EXISTS payment_amount INTEGER;

CREATE INDEX IF NOT EXISTS idx_orders_qris_string ON orders(qris_string) WHERE qris_string IS NOT NULL;

ALTER TABLE orders 
  ADD CONSTRAINT chk_payment_amount CHECK (payment_amount IS NULL OR payment_amount >= 0);
```

5. Klik **Run** untuk setiap query
6. ✅ Selesai! Restart dev server jika perlu

---

### Opsi 2: Gunakan API Endpoint (Quick Fix)

1. Pastikan dev server berjalan: `npm run dev`
2. Buka browser dan akses:
   ```
   http://localhost:3000/api/fix-schema
   ```
3. Kirim POST request (gunakan Postman/curl):
   ```bash
   curl -X POST http://localhost:3000/api/fix-schema
   ```
4. ⚠️ **Note**: Cara ini mungkin tidak bekerja jika Supabase RPC tidak tersedia

---

### Opsi 3: Jalankan via Supabase CLI

Jika Anda punya Supabase CLI terinstall:

```bash
# Link ke project Supabase Anda
supabase link --project-ref kthxxmyqpotteedkzjrt

# Jalankan semua migration
supabase db push
```

---

## Verifikasi

Setelah menjalankan salah satu opsi di atas, verifikasi dengan:

### 1. Cek di Supabase Dashboard:
- Buka **Table Editor** → **orders**
- Pastikan kolom ini ada:
  - ✅ `product_id`
  - ✅ `qris_string`
  - ✅ `payment_amount`

### 2. Test di aplikasi:
```bash
npm run dev
```
- Buat order baru dari halaman utama
- Buka `/orders`
- Error tidak boleh muncul lagi

---

## Troubleshooting

### Masih error setelah jalankan migration?

1. **Restart dev server**:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

2. **Clear cache**:
   ```bash
   rm -rf .next
   npm run dev
   ```

3. **Cek koneksi database**:
   - Pastikan `NEXT_PUBLIC_SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` di `.env.local` benar

### Kolom sudah ada tapi masih error?

Issue di schema cache Supabase. Fix:
```sql
-- Di SQL Editor, jalankan ini:
NOTIFY pgrst, 'reload schema';
```

---

## Cross Origin Warning

Warning ini muncul karena Anda akses dari IP `192.168.5.77`. Sudah diperbaiki di `next.config.ts`.

Jika masih muncul, tambahkan IP Anda:

```typescript
// next.config.ts
allowedDevOrigins: [
  'http://192.168.5.77',
  'http://192.168.5.77:3000',
  // Tambah IP lain jika perlu
],
```

---

## Summary File Migration

Semua file SQL ada di folder `/supabase/`:
- `001_create_orders_table.sql` - Buat tabel orders awal
- `002_add_product_id.sql` - Migration lama (mungkin sudah dijalankan)
- `003_add_qris_payment_columns.sql` - ⭐ WAJIB JALANKAN - Tambah kolom QRIS
- `004_add_product_id_column.sql` - ⭐ WAJIB JALANKAN - Fix product_id

**URUTAN JALANKAN**: 003 → 004 (atau sebaliknya, tidak masalah)
