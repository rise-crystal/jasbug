# Cara Expire Order yang Stuck - 3 Metode

## Masalah
Order masih `pending_pembayaran` padahal sudah lewat 5 menit. API `/api/payment/auto-expire` belum ter-deploy di Vercel.

## Solusi 1: Via Supabase SQL Editor (INSTANT - RECOMMENDED)

1. Buka: https://supabase.com/dashboard
2. Pilih project Anda
3. Klik **SQL Editor** di sidebar kiri
4. Paste dan jalankan query ini:

```sql
-- Expire semua order pending_pembayaran yang sudah lewat 5 menit
UPDATE orders
SET status = 'expired'
WHERE status = 'pending_pembayaran'
  AND payment_proof_url IS NULL
  AND created_at < NOW() - INTERVAL '5 minutes';
```

5. Klik **Run** atau tekan `Ctrl + Enter`
6. Hasil akan muncul: "X rows affected"

### Untuk Expire Specific Order:
```sql
-- Expire order tertentu (ganti UUID dengan order ID Anda)
UPDATE orders
SET status = 'expired'
WHERE id = '251f66ab-8825-49fe-8dc5-61743892fb32'
  AND status = 'pending_pembayaran';
```

## Solusi 2: Via Vercel Dashboard (Setelah Deploy Selesai)

1. Buka: https://vercel.com/dashboard
2. Pilih project **jasbug**
3. Klik **Settings** → **Cron Jobs**
4. Klik **Run Now** di cron job `/api/payment/auto-expire`

## Solusi 3: Via curl/PowerShell (Setelah Deploy Selesai)

### Preview order yang akan expire:
```powershell
curl https://jasbug.vercel.app/api/payment/auto-expire
```

### Execute auto-expire:
```powershell
curl -X POST https://jasbug.vercel.app/api/payment/auto-expire
```

Atau gunakan script PowerShell:
```powershell
.\test-auto-expire.ps1
```

## Monitoring

### Cek order yang masih pending:
```sql
SELECT 
  custom_id,
  status,
  created_at,
  payment_proof_url,
  EXTRACT(EPOCH FROM NOW() - created_at) / 60 AS minutes_ago
FROM orders
WHERE status = 'pending_pembayaran'
ORDER BY created_at DESC;
```

### Cek order yang sudah expired:
```sql
SELECT 
  custom_id,
  status,
  created_at,
  payment_proof_url
FROM orders
WHERE status = 'expired'
ORDER BY created_at DESC
LIMIT 10;
```

## Troubleshooting API 404

Jika `/api/payment/auto-expire` masih 404:

1. **Cek Deployment Status**: 
   - Buka https://vercel.com/dashboard → jasbug → Deployments
   - Pastikan status "Ready" (bukan "Building" atau "Error")

2. **Trigger Redeploy**:
   - Di Vercel Dashboard, klik deployment terbaru
   - Klik **⋮** (menu) → **Redeploy**

3. **Cek Build Logs**:
   - Di deployment page, scroll ke bawah untuk melihat build logs
   - Cari error message jika ada

4. **Clear Cache & Redeploy**:
   - Settings → General → Build & Development Settings
   - Klik "Clear Build Cache" lalu redeploy

## Next Steps

Setelah deployment Vercel selesai, cron job akan berjalan otomatis setiap 1 menit untuk expire order yang stuck.
