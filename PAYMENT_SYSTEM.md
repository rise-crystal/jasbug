# Sistem Pembayaran QRIS Dinamis

## Gambaran Umum
Sistem pembayaran QRIS dinamis telah berhasil diimplementasikan dengan fitur:
- ✅ Generate QR Code dinamis dengan nominal spesifik
- ✅ Real-time payment monitoring
- ✅ Auto-update status pembayaran
- ✅ Webhook handler untuk payment callback
- ✅ UI interaktif untuk pembayaran

## File yang Dibuat/Diubah

### 1. Library QRIS Dinamis
**File:** `src/lib/qris-dinamis.ts`

Fitur:
- Parse TLV (Tag-Length-Value) structure
- Convert QRIS statis ke dinamis
- Inject nominal pembayaran
- Recalculate CRC16-CCITT checksum
- Generate QR Code sebagai data URL

Penggunaan:
```typescript
import { QRISDinamis } from '@/lib/qris-dinamis';

// Buat instance dari QRIS statis
const qris = new QRISDinamis(BASE_QRIS_STRING);

// Convert ke dinamis dengan nominal
const qrisDinamis = qris.setAmount(10000);

// Generate QR Code
const qrCodeDataUrl = await qrisDinamis.generateQRCodeDataUrl(300);
```

### 2. API Routes

#### Generate QRIS Payment
**Endpoint:** `POST /api/payment/qris`
**Body:** `{ orderId: string }`
**Response:** QR Code data URL dan informasi pembayaran

#### Check Payment Status
**Endpoint:** `GET /api/payment/status/[orderId]`
**Response:** Status order dan detail pembayaran

#### Webhook Handler
**Endpoint:** `POST /api/payment/webhook`
**Fungsi:** Menerima callback dari payment provider

### 3. Database Migration
**File:** `supabase/003_add_qris_payment_columns.sql`

Menambahkan kolom:
- `qris_string` - Menyimpan string QRIS dinamis
- `payment_amount` - Nominal pembayaran

### 4. UI Orders Page
**File:** `src/app/orders/page.tsx`

Fitur baru:
- Tombol "Bayar" untuk generate QR code
- Panel QR code interaktif
- Auto-polling status pembayaran (setiap 3 detik)
- Real-time update via Supabase realtime

## Setup

### 1. Jalankan Migration
Di Supabase Dashboard SQL Editor, jalankan:
```sql
-- File: supabase/003_add_qris_payment_columns.sql
```

### 2. Konfigurasi QRIS Statis
Tambahkan ke `.env.local`:
```env
QRIS_STATIC_CODE=000201010211...
```

Ganti dengan QRIS statis merchant Anda yang sebenarnya dari DANA/payment provider.

### 3. Jalankan Development Server
```bash
npm run dev
```

### 4. Test Pembayaran
1. Buat order baru dari halaman utama
2. Buka halaman `/orders`
3. Klik order yang statusnya "pending"
4. Klik tombol "📱 Bayar"
5. Scan QR code dengan e-wallet (DANA, GoPay, dll)

## Flow Pembayaran

```
1. User buat order → Status: pending
2. User klik "Bayar" di halaman orders
3. System generate QRIS dinamis dengan nominal
4. QR code ditampilkan di panel kanan
5. User scan QR code dengan e-wallet
6. Payment provider process pembayaran
7. Webhook callback → Update status order
8. UI auto-update (via polling & realtime)
9. Status berubah: berhasil/gagal
```

## Webhook Integration

Untuk mengintegrasikan dengan payment provider:

1. **Setup Webhook URL**
   - Daftarkan: `https://yourdomain.com/api/payment/webhook`
   - Di dashboard payment provider

2. **Verifikasi Signature** (Opsional tapi direkomendasikan)
   - Uncomment kode verifikasi di `webhook/route.ts`
   - Tambahkan `PAYMENT_WEBHOOK_SECRET` ke `.env.local`

3. **Payload yang Diharapkan**
```json
{
  "order_id": "uuid-order",
  "transaction_id": "dana-transaction-id",
  "status": "success | failed | pending",
  "amount": 10000,
  "signature": "hmac-signature"
}
```

## Testing Manual

### Test Generate QRIS
```bash
curl -X POST http://localhost:3000/api/payment/qris \
  -H "Content-Type: application/json" \
  -d '{"orderId":"your-order-uuid"}'
```

### Test Check Status
```bash
curl http://localhost:3000/api/payment/status/your-order-uuid
```

### Test Webhook
```bash
curl -X POST http://localhost:3000/api/payment/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "your-order-uuid",
    "transaction_id": "test123",
    "status": "success"
  }'
```

## Catatan Penting

⚠️ **QRIS Statis Merchant**
- QRIS statis dari DANA/payment provider HARUS diganti dengan punya Anda sendiri
- Default yang ada hanya contoh

💰 **Harga Produk**
- Harga didefinisikan di `src/app/api/payment/qris/route.ts`
- Konstanta: `PRODUCT_PRICES`

⏱️ **Payment Timeout**
- QR code berlaku 30 menit
- Auto-polling setiap 3 detik
- Bisa disesuaikan di `startPaymentPolling()`

🔒 **Security**
- Enable webhook signature verification di production
- Validasi semua input dari payment provider
- Gunakan HTTPS untuk webhook endpoint

## Troubleshooting

### QR Code tidak muncul
- Cek console browser untuk error
- Pastikan `qrcode` package terinstall
- Cek BASE_QRIS di environment variables

### Status order tidak update
- Cek webhook logs di payment provider dashboard
- Pastikan endpoint webhook accessible (tidak localhost)
- Cek Supabase logs untuk error

### Build error
- Pastikan semua dependencies terinstall: `npm install`
- Cek TypeScript errors: `npm run build`

## Next Steps (Opsional)

- [ ] Integrasi dengan payment provider sungguhan (DANA, Midtrans, Xendit)
- [ ] Tambah email notification saat pembayaran berhasil
- [ ] Implementasi payment timeout/auto-cancel
- [ ] Tambah riwayat pembayaran per user
- [ ] Dashboard admin untuk monitor semua pembayaran
