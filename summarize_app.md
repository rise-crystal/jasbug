# Product Requirements Document (PRD) - FlashSend

## 1. Identitas Proyek

- **Nama Proyek:** FlashSend
- **Tujuan:** Aplikasi pengiriman produk digital otomatis satu harga (Rp10.000).
- **Teknologi Utama:** Next.js (App Router), Supabase (Database & Realtime), `dana-node` (Payment Gateway).
- **Prinsip Sistem:** **No-Admin System** (Otomatisasi penuh dari pembayaran hingga status akhir).

---

## 2. Fitur Utama

- **Single-Price Checkout:** Harga produk statis di angka Rp10.000.
- **Instant Payment:** Integrasi pembayaran via DANA menggunakan library `dana-node`.
- **Real-time Tracking:** Halaman daftar pesanan yang memperbarui status secara otomatis tanpa refresh.
- **Automated Fulfillment:** Logika perubahan status dikendalikan oleh sistem melalui Webhook.

---

## 3. Alur Pengguna (User Flow)

1.  **Halaman Utama:** Pengguna memasukkan nomor telepon tujuan.
2.  **Checkout:** Pengguna mengklik "Beli", sistem membuat transaksi di database dan mengarahkan pengguna ke halaman pembayaran DANA.
3.  **Proses Pembayaran:** Pengguna menyelesaikan pembayaran di aplikasi DANA.
4.  **Halaman Pesanan:** Pengguna diarahkan kembali ke web untuk melihat status pesanan mereka secara real-time.

---

## 4. Arsitektur Teknis & Status Pesanan

### A. Alur Status Otomatis

| Status       | Pemicu (Trigger)                                                                           |
| :----------- | :----------------------------------------------------------------------------------------- |
| **Pending**  | User berhasil membuat pesanan tapi belum membayar atau pembayaran masih diproses DANA.     |
| **Berhasil** | Webhook DANA mengirimkan notifikasi sukses DAN sistem selesai memproses pengiriman produk. |
| **Gagal**    | Pembayaran kadaluwarsa (expired) atau terjadi gangguan pada API pengiriman produk.         |

### B. Integrasi Database (Supabase)

Tabel `orders` akan berfungsi sebagai _single source of truth_:

- `id`: UUID (Primary Key)
- `phone_number`: String (Nomor tujuan)
- `status`: String (Default: `pending`)
- `dana_transaction_id`: String (Untuk rekonsiliasi data)
- `created_at`: Timestamp

---

## 5. Spesifikasi Teknis (Kebutuhan Sistem)

### Frontend (Next.js)

- Menggunakan **Server Actions** untuk validasi nomor telepon.
- Menggunakan **Supabase Realtime Subscription** pada halaman daftar pesanan agar status berubah otomatis di layar user saat database diperbarui oleh Webhook.

### Backend & Library (`dana-node`)

- Membuat API Route `/api/webhook/dana` untuk menangkap callback dari DANA.
- Logika verifikasi _signature_ DANA untuk memastikan data yang masuk valid dan bukan manipulasi.
- Logika otomatis: Jika `payment_status == SUCCESS`, maka jalankan fungsi pengiriman produk dan update status ke `berhasil`.

---

## 6. Rencana Kerja (Roadmap)

1.  **Fase 1:** Setup Project Next.js dan Inisialisasi Supabase.
2.  **Fase 2:** Integrasi `dana-node` untuk pembuatan URL pembayaran (SandBox mode).
3.  **Fase 3:** Pembuatan API Webhook untuk menangani perubahan status otomatis.
4.  **Fase 4:** Implementasi UI Daftar Pesanan dengan fitur _Real-time Update_.
5.  **Fase 5:** Testing transaksi dan keamanan _rate-limiting_.

---

## 7. Keamanan & Validasi

- **Input Validation:** Validasi nomor telepon harus berformat Indonesia (Contoh: 08xx atau 628xx).
- **Idempotency:** Memastikan satu ID transaksi dari DANA hanya diproses satu kali untuk menghindari pengiriman produk ganda.
- **Rate Limiting:** Membatasi jumlah request dari IP yang sama untuk mencegah serangan spam pada gateway pembayaran.

---
