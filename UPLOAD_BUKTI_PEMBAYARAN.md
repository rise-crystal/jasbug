# Sistem Upload Bukti Pembayaran

## 🎉 Gambaran Umum
Sistem pembayaran manual dengan upload bukti transfer. User bayar manual → Upload bukti → Admin verifikasi → Order selesai.

## ✨ Fitur

### User Side (`/orders`)
- ✅ Upload bukti pembayaran (JPG, PNG, WebP, PDF)
- ✅ Preview bukti yang sudah diupload
- ✅ Status verifikasi real-time
- ✅ Max file size 5MB
- ✅ Validasi format file otomatis

### Admin Side (`/admin`)
- ✅ List semua pembayaran yang belum diverifikasi
- ✅ Preview bukti pembayaran (fullscreen modal)
- ✅ Approve/Reject dengan satu klik
- ✅ Filter: Belum Diverifikasi / Semua
- ✅ Counter pembayaran pending

## 📋 Setup Database

### WAJIB JALANKAN di Supabase SQL Editor:

**File:** `supabase/005_setup_payment_proof_storage.sql`

```sql
-- Copy-paste SEMUA isi file ini ke SQL Editor Supabase
-- Jalankan SEKALIGUS (block semua, klik Run)
```

File ini akan membuat:
1. ✅ Storage Bucket `payment-proofs`
2. ✅ RLS Policies untuk upload & read
3. ✅ Kolom di tabel `orders`:
   - `payment_proof_url` - URL bukti yang diupload
   - `payment_proof_verified` - Status verifikasi
   - `payment_proof_verified_at` - Timestamp verifikasi
   - `payment_verified_by` - ID admin yang verifikasi (future use)

## 🚀 Cara Menggunakan

### 1. Setup Database
```
1. Buka https://app.supabase.com
2. Pilih project → SQL Editor
3. Copy-paste isi file: supabase/005_setup_payment_proof_storage.sql
4. Klik Run
5. ✅ Selesai
```

### 2. Jalankan Development Server
```bash
npm run dev
```

### 3. Test Upload (User Flow)
```
1. Buat order baru dari halaman utama (/)
2. Buka halaman /orders
3. Klik order yang statusnya "pending"
4. Klik tombol "📸 Upload Bukti"
5. Pilih file gambar/PDF (max 5MB)
6. Tunggu upload selesai
7. ✅ Status berubah jadi "Menunggu Verifikasi"
```

### 4. Test Verifikasi (Admin Flow)
```
1. Buka halaman /admin
2. Lihat list pembayaran pending
3. Klik "👁️ Lihat Bukti" untuk preview
4. Klik "✅ Setujui Pembayaran" atau "❌ Tolak"
5. ✅ Order status otomatis berubah
```

## 📁 File yang Dibuat/Diubah

### Baru:
- `supabase/005_setup_payment_proof_storage.sql` - Setup storage & kolom
- `src/app/api/payment/upload-proof/route.ts` - API upload file
- `src/app/api/payment/verify/[orderId]/route.ts` - API verifikasi admin
- `src/app/admin/page.tsx` - Halaman admin verifikasi

### Diubah:
- `src/lib/supabase.ts` - Tambah fungsi `uploadFile()`
- `src/app/orders/page.tsx` - Tambah UI upload & status verifikasi
- `src/app/orders/page.tsx` - Interface Order update dengan kolom baru

## 🔄 Flow Pembayaran

```
┌─────────────────────────────────────────────────────────┐
│ 1. User membuat order                                 │
│    Status: pending                                     │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 2. User bayar manual (transfer ke rekening/DANA)       │
│    User upload bukti transfer                          │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Status: "Menunggu Verifikasi"                       │
│    Admin dapat notifikasi (via realtime Supabase)      │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Admin cek bukti di /admin                           │
│    Preview → Approve/Reject                            │
└─────────────────────────────────────────────────────────┘
                      ↓
        ┌─────────────┴──────────────┐
        ↓                            ↓
   ✅ APPROVED                  ❌ REJECTED
   Status: berhasil             Status: gagal
   Order selesai                User bisa upload ulang
```

## 🎨 UI Features

### Halaman Orders (`/orders`)
- **Tombol Upload Bukti**: Hijau dengan ikon 📸
- **Status Verifikasi**: 
  - ✅ Terverifikasi (hijau + timestamp)
  - ⏳ Menunggu Verifikasi (kuning)
- **Preview Modal**: Klik "👁️ Lihat" untuk fullscreen
- **Auto-update**: Via Supabase Realtime

### Halaman Admin (`/admin`)
- **Filter Button**: Unverified / All
- **Preview Button**: Lihat bukti fullscreen
- **Action Buttons**:
  - ✅ Setujui Pembayaran (hijau, besar)
  - ❌ Tolak Pembayaran (merah, lebih kecil)
- **Counter**: Jumlah pembayaran pending

## 🔒 Security

### File Upload
- ✅ Max size: 5MB
- ✅ Allowed types: JPG, PNG, WebP, PDF
- ✅ Validasi server-side
- ✅ Unique filename (timestamp + random)

### Storage Policies
- ✅ Public upload (siapapun bisa upload)
- ✅ Public read (admin bisa lihat)
- ✅ Authenticated delete (hanya admin)

### Admin Verification
- ✅ API endpoint terpisah
- ✅ Validasi order exists
- ✅ Cek bukti sudah ada
- ✅ Timestamp verifikasi

## 📊 API Endpoints

### Upload Bukti
```
POST /api/payment/upload-proof
Content-Type: multipart/form-data

Body:
- file: File (image/pdf)
- orderId: string

Response:
{
  "success": true,
  "proofUrl": "https://...",
  "message": "Bukti pembayaran berhasil diupload"
}
```

### Verifikasi Pembayaran
```
PUT /api/payment/verify/[orderId]
Content-Type: application/json

Body:
{
  "verified": true,  // atau false
  "reason": "Opsional"  // jika ditolak
}

Response:
{
  "success": true,
  "message": "Pembayaran berhasil diverifikasi",
  "newStatus": "berhasil"
}
```

## 🐛 Troubleshooting

### Error: "Bucket not found"
```
Solusi: Jalankan migration SQL di Supabase
File: supabase/005_setup_payment_proof_storage.sql
```

### Upload gagal tanpa error
```
1. Cek ukuran file (max 5MB)
2. Cek format file (hanya JPG, PNG, WebP, PDF)
3. Cek console browser untuk error detail
```

### File terupload tapi URL tidak tersimpan
```
1. Cek kolom payment_proof_url di database
2. Jalankan: ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
```

### Admin tidak bisa lihat bukti
```
1. Cek RLS policies di Supabase Storage
2. Pastikan bucket 'payment-proofs' public
3. Test akses URL langsung di browser
```

## 💡 Tips Penggunaan

### Untuk User:
- 📸 Screenshot bukti transfer harus jelas
- 💰 Pastikan nominal terlihat
- 🕐 Upload sesegera mungkin setelah transfer
- ⏳ Tunggu verifikasi admin (biasanya cepat)

### Untuk Admin:
- 🔍 Cek detail bukti sebelum approve
- 💵 Cocokkan nominal dengan harga produk
- 📞 Konfirmasi ke user jika ragu
- ❌ Tolak jika bukti tidak valid

## 🚀 Next Steps (Opsional)

- [ ] Email notification saat pembayaran diverifikasi
- [ ] WhatsApp notification (via API)
- [ ] Auto-reject setelah X jam jika tidak diverifikasi
- [ ] Admin authentication (password protected)
- [ ] Export laporan pembayaran (Excel/PDF)
- [ ] Chat system untuk konfirmasi
- [ ] Multiple payment methods support

---

## ⚡ Quick Start

```bash
# 1. Setup database
# Jalankan: supabase/005_setup_payment_proof_storage.sql

# 2. Install dependencies (jika belum)
npm install

# 3. Run dev server
npm run dev

# 4. Test
# Buka: http://localhost:3000/orders
# Buka: http://localhost:3000/admin
```

**Selamat! Sistem pembayaran manual siap digunakan!** 🎉
