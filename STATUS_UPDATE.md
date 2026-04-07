# Pembaruan Status Pembayaran: Pending Pembayaran & Pending Konfirmasi Admin

## Tanggal: 2026-04-07

## Ringkasan Perubahan

Sistem pembayaran telah diperbarui untuk memisahkan status **pending** menjadi 2 status yang lebih spesifik:

### Status Baru

| Status | Keterangan |
|--------|-----------|
| `pending_pembayaran` | Order telah dibuat, tetapi customer **belum melakukan pembayaran** atau upload bukti |
| `pending_konfirmasi_admin` | Customer **sudah upload bukti pembayaran**, tetapi **menunggu verifikasi admin** |
| `berhasil` | Pembayaran telah diverifikasi dan disetujui oleh admin |
| `gagal` | Pembayaran ditolak atau gagal |
| `expired` | Order kadaluarsa (5 menit tanpa pembayaran) |

## Alur Pembayaran Baru

1. **Customer membuat order** → Status: `pending_pembayaran`
2. **Customer melakukan pembayaran** via QRIS atau transfer manual
3. **Jika transfer manual**, customer upload bukti pembayaran → Status berubah jadi: `pending_konfirmasi_admin`
4. **Admin melakukan verifikasi** bukti pembayaran di halaman admin
   - **Jika disetujui**: Status → `berhasil`, bug dikirim ke target
   - **Jika ditolak**: Status → `gagal`
5. **Jika 5 menit tanpa pembayaran**, order otomatis → `expired`

## File yang Diubah

### Database
- `database/migrations/add_pending_pembayaran_and_konfirmasi_admin.sql` - Migration baru untuk status baru

### Backend/API
- `src/lib/actions.ts` - Update tipe dan validasi status
- `src/app/api/payment/qris/route.ts` - Izinkan QRIS generation untuk kedua status pending
- `src/app/api/payment/upload-proof/route.ts` - Set status ke `pending_konfirmasi_admin` saat upload bukti
- `src/app/api/payment/status/[orderId]/route.ts` - Update validasi status
- `src/app/api/payment/webhook/route.ts` - Update mapping status dari payment provider

### Frontend
- `src/app/admin/page.tsx` - Filter dan tampilkan kedua status pending dengan badge berbeda
- `src/app/payment/page.tsx` - Update logika timer dan UI untuk status baru

## Migrasi Database

Jalankan migration ini di database Supabase Anda:

```sql
-- File: database/migrations/add_pending_pembayaran_and_konfirmasi_admin.sql
```

Migration ini akan:
1. ✅ Update default value kolom `status` dari `'pending'` menjadi `'pending_pembayaran'`
2. ✅ Menambahkan `CHECK constraint` bernama `orders_status_check` untuk memvalidasi status
3. ✅ Mengconvert semua order dengan status `pending` lama menjadi `pending_pembayaran`

### ⚠️ Catatan Penting Setelah Migration

Jika ada order yang statusnya `pending` tetapi **sudah upload bukti pembayaran**, Anda perlu update manual:

```sql
UPDATE orders 
SET status = 'pending_konfirmasi_admin'
WHERE status = 'pending_pembayaran' 
  AND payment_proof_url IS NOT NULL;
```

### Rollback Plan

Jika perlu rollback ke sistem lama:

```sql
-- Rollback script
UPDATE orders SET status = 'pending' 
WHERE status IN ('pending_pembayaran', 'pending_konfirmasi_admin');

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending';
```

## Perbedaan dengan Sistem Lama

| Aspek | Sistem Lama | Sistem Baru |
|-------|------------|------------|
| Status pending | Satu status `pending` untuk semua kondisi | Terpisah: `pending_pembayaran` dan `pending_konfirmasi_admin` |
| Upload bukti | Status tetap `pending` | Status berubah jadi `pending_konfirmasi_admin` |
| Admin filter | Filter `status = 'pending'` | Filter `status IN ('pending_pembayaran', 'pending_konfirmasi_admin')` |
| UI admin | Tidak ada badge status | Ada badge berbeda untuk setiap jenis pending |
| Timer expiry | Berjalan untuk semua `pending` | Hanya berjalan untuk `pending_pembayaran` |

## Keuntungan Sistem Baru

1. **Lebih jelas untuk customer**: Customer bisa tahu apakah pembayaran mereka sudah diterima dan menunggu verifikasi
2. **Lebih mudah untuk admin**: Admin bisa membedakan mana yang belum bayar vs mana yang sudah upload bukti
3. **Lebih akurat**: Status order lebih menggambarkan kondisi sebenarnya
4. **Monitoring lebih baik**: Bisa membuat laporan berdasarkan jenis pending

## Testing Checklist

Setelah deploy migration, pastikan untuk test:

- [ ] Membuat order baru (harus status `pending_pembayaran`)
- [ ] Upload bukti pembayaran (status harus berubah ke `pending_konfirmasi_admin`)
- [ ] Admin approve pembayaran (status harus berubah ke `berhasil`)
- [ ] Admin reject pembayaran (status harus berubah ke `gagal`)
- [ ] Order expired setelah 5 menit tanpa pembayaran (status harus berubah ke `expired`)
- [ ] Badge status tampil dengan benar di admin dan payment page
- [ ] Countdown timer hanya berjalan untuk `pending_pembayaran`, bukan `pending_konfirmasi_admin`

## Catatan Penting

- Semua order yang sudah ada dengan status `pending` akan otomatis di-convert ke `pending_pembayaran` saat migration dijalankan
- Webhook payment provider akan mapping status `pending` dari provider ke `pending_pembayaran` di database
- QRIS masih bisa di-generate untuk kedua status pending (jika admin perlu regenerate QR)
- **CHECK constraint** akan menolak insert/update dengan status yang tidak valid

## Rollback Plan

~~Jika perlu rollback ke sistem lama:~~

Lihat bagian **Rollback Plan** di atas (dalam section Migrasi Database)

~~1. Update semua status `pending_pembayaran` dan `pending_konfirmasi_admin` kembali ke `pending`
2. Drop constraint baru dan buat constraint lama kembali
3. Revert semua perubahan kode ke versi sebelumnya~~

~~```sql~~
~~-- Rollback script (jika diperlukan)~~
~~UPDATE orders SET status = 'pending' WHERE status IN ('pending_pembayaran', 'pending_konfirmasi_admin');~~

~~ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;~~
~~ALTER TABLE orders ADD CONSTRAINT orders_status_check ~~
~~  CHECK (status IN ('pending', 'berhasil', 'gagal', 'expired'));~~
~~```~~
