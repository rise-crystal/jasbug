# Cron Jobs Setup di Vercel

Dokumentasi ini menjelaskan cara mengkonfigurasi dan menggunakan Cron Jobs di Vercel untuk auto-expire order.

## Struktur yang Sudah Dikonfigurasi

### 1. Cron Job Endpoint

Endpoint cron job sudah tersedia di:
```
src/app/api/payment/auto-expire/route.ts
```

Endpoint ini:
- Berjalan setiap 1 menit (`*/1 * * * *`)
- Auto-expire order dengan status `pending_pembayaran` yang sudah lebih dari 5 menit
- Menggunakan validasi `CRON_SECRET` untuk keamanan

### 2. Konfigurasi Vercel

File `vercel.json` sudah dikonfigurasi dengan cron job:

```json
{
  "crons": [
    {
      "path": "/api/payment/auto-expire",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

### 3. Security - CRON_SECRET

Endpoint cron menggunakan `CRON_SECRET` environment variable untuk mencegah akses tidak sah.

**Cara kerja:**
- Vercel secara otomatis menambahkan header `Authorization: Bearer <CRON_SECRET>` saat memanggil cron job
- Endpoint akan mengecek header ini dan menolak request jika tidak valid

## Setup Steps

### Langkah 1: Tambahkan CRON_SECRET ke Environment Variables

1. Buka dashboard Vercel
2. Pilih project Anda
3. Buka **Settings** > **Environment Variables**
4. Tambahkan variable baru:
   - **Key:** `CRON_SECRET`
   - **Value:** Buat secret key yang aman (contoh: `my-secret-key-123` atau gunakan generator)
   - **Environment:** Pilih semua (Production, Preview, Development)

**Atau menggunakan Vercel CLI:**

```bash
vercel env add CRON_SECRET
```

### Langkah 2: Deploy ke Vercel

Setelah menambahkan environment variable, deploy ulang project:

```bash
vercel --prod
```

Atau push ke branch production Anda.

### Langkah 3: Verifikasi Cron Job Berjalan

1. Buka **Vercel Dashboard** > Project Anda
2. Klik tab **Cron Jobs**
3. Anda akan melihat daftar cron job yang aktif
4. Klik **Run Now** untuk test manual
5. Cek logs untuk memastikan tidak ada error

## Testing Lokal

### Test Endpoint Secara Manual

Menggunakan curl dengan CRON_SECRET:

```bash
curl -X POST http://localhost:3000/api/payment/auto-expire \
  -H "Authorization: Bearer your-cron-secret"
```

Menggunakan PowerShell:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/payment/auto-expire" -Method POST -Headers @{
  "Authorization" = "Bearer your-cron-secret"
}
```

### Preview Mode (GET Request)

Endpoint juga mendukung GET request untuk melihat order yang akan di-expire tanpa benar-benar mengubah status:

```bash
curl http://localhost:3000/api/payment/auto-expire
```

## Cron Schedule Reference

Format: `* * * * *` (menit jam tanggal bulan hari)

Contoh schedule:
- `*/1 * * * *` - Setiap 1 menit (yang sedang digunakan)
- `*/5 * * * *` - Setiap 5 menit
- `0 * * * *` - Setiap jam
- `0 0 * * *` - Setiap tengah malam
- `0 10 * * *` - Setiap jam 10 pagi

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Berhasil expire 3 order(s)",
  "expiredCount": 3,
  "expiredOrders": [
    {
      "id": "uuid",
      "custom_id": "ORD-001",
      "created_at": "2024-01-01T10:00:00.000Z",
      "previousStatus": "pending_pembayaran",
      "newStatus": "expired"
    }
  ]
}
```

### No Orders to Expire

```json
{
  "success": true,
  "message": "Tidak ada order yang perlu di-expire",
  "expiredCount": 0,
  "expiredOrders": []
}
```

### Unauthorized (401)

```json
{
  "error": "Unauthorized: Invalid or missing CRON_SECRET"
}
```

## Troubleshooting

### Cron Job Tidak Berjalan

1. Pastikan `vercel.json` sudah benar
2. Cek tab **Cron Jobs** di dashboard Vercel
3. Pastikan environment variable `CRON_SECRET` sudah diset
4. Cek logs di **Deployment** > **Functions**

### Error 401 Unauthorized

- Pastikan `CRON_SECRET` di environment variable sama dengan yang digunakan Vercel
- Vercel otomatis menambahkan header Authorization saat memanggil cron job

### Error 500 Database

- Pastikan koneksi Supabase sudah benar
- Cek environment variable Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, dll)

## Migration dari ADMIN_SECRET_KEY

Jika sebelumnya menggunakan `ADMIN_SECRET_KEY`, endpoint sudah diupdate untuk menggunakan `CRON_SECRET`. 

**Perubahan:**
- Validasi sekarang menggunakan `CRON_SECRET` dari environment variable
- Header Authorization tetap menggunakan format `Bearer <secret>`
- Backward compatibility dengan `ADMIN_SECRET_KEY` sudah dihapus

**Action Required:**
- Tambahkan `CRON_SECRET` ke environment variables di Vercel
- Update script eksternal jika ada yang masih menggunakan `ADMIN_SECRET_KEY`

## Link Dokumentasi

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Next.js App Router API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
