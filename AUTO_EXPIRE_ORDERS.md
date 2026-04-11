# Auto-Expire Payment Orders

## Problem
Order dengan status `pending_pembayaran` tidak otomatis berubah menjadi `expired` setelah 5 menit. Sistem sebelumnya hanya berjalan di client-side (admin page), sehingga order tidak akan expire jika tidak ada yang membuka halaman admin.

## Solution
Dibuat API endpoint server-side untuk auto-expire yang bisa:
1. Dipanggil manual via curl/HTTP request
2. Dipanggil otomatis saat admin page dibuka
3. Dijalankan sebagai cron job (opsional)

## New API Endpoint

### `POST /api/payment/auto-expire`
Expire semua order yang sudah lewat 5 menit tanpa pembayaran.

**Response:**
```json
{
  "success": true,
  "message": "Berhasil expire 1 order(s)",
  "expiredCount": 1,
  "expiredOrders": [
    {
      "id": "order-uuid",
      "custom_id": "SQID...",
      "created_at": "2026-04-11T12:12:58.637867+00:00",
      "previousStatus": "pending_pembayaran",
      "newStatus": "expired"
    }
  ]
}
```

### `GET /api/payment/auto-expire`
Preview order yang akan di-expire (dry run).

**Response:**
```json
{
  "success": true,
  "expiredCount": 1,
  "expiredOrders": [
    {
      "id": "order-uuid",
      "custom_id": "SQID...",
      "created_at": "2026-04-11T12:12:58.637867+00:00",
      "status": "pending_pembayaran",
      "minutesAgo": 10
    }
  ]
}
```

## Deployment ke Vercel

### Setup Vercel Cron Jobs

File `vercel.json` sudah dikonfigurasi untuk menjalankan auto-expire setiap 1 menit:

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

**Setelah deploy ke Vercel:**
1. Buka Vercel Dashboard
2. Pilih project Anda
3. Pergi ke Settings → Cron Jobs
4. Pastikan cron job `/api/payment/auto-expire` sudah aktif
5. Cron akan berjalan otomatis setiap 1 menit

### Manual Testing di Production
```bash
# Preview order yang akan expire
curl https://your-domain.vercel.app/api/payment/auto-expire

# Expire semua order yang sudah lewat 5 menit
curl -X POST https://your-domain.vercel.app/api/payment/auto-expire
```

## Usage

### Local Development
```bash
# Start server
npm run dev

# Preview order yang akan expire
curl http://localhost:3000/api/payment/auto-expire

# Expire orders
curl -X POST http://localhost:3000/api/payment/auto-expire

# Verify no more expired orders
curl http://localhost:3000/api/payment/auto-expire
```

## Files Changed
- ✅ `src/app/api/payment/auto-expire/route.ts` - New API endpoint
- ✅ `src/app/admin/page.tsx` - Updated to use auto-expire API
- ✅ `src/app/admin/orders/page.tsx` - Updated to use auto-expire API

## Business Logic
Order akan di-expire jika:
1. Status = `pending_pembayaran`
2. `payment_proof_url` = NULL (belum upload bukti pembayaran)
3. `created_at` > 5 menit yang lalu

## Testing
```bash
# 1. Check order yang akan expire
curl http://localhost:3000/api/payment/auto-expire

# 2. Expire orders
curl -X POST http://localhost:3000/api/payment/auto-expire

# 3. Verify no more expired orders
curl http://localhost:3000/api/payment/auto-expire
```
