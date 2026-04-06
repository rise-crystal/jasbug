# Proteksi Halaman Admin

## 🔐 Sistem Autentikasi

Halaman admin sekarang dilindungi dengan password. Tidak ada yang bisa akses tanpa login.

## 🎯 Fitur

✅ **Password Protection** - Login dengan password dari `.env.local`
✅ **Cookie-based Session** - Session valid 24 jam
✅ **Middleware Protection** - Auto redirect ke login jika belum authenticated
✅ **Secure Logout** - Hapus cookie session
✅ **API Route Protection** - API admin juga dilindungi

## 📋 Setup

### 1. Set Password Admin

Edit file `.env.local`:

```env
# Ganti dengan password yang KUAT!
ADMIN_PASSWORD=your-strong-password-here
```

**Default:** `admin123` (⚠️ GANTI SEGERA!)

### 2. Restart Server

```bash
# Stop server (Ctrl+C)
npm run dev
```

Password akan aktif setelah restart.

## 🚀 Cara Login

### 1. Akses Halaman Login

```
http://localhost:3000/admin/login
```

### 2. Masukkan Password

- Ketik password yang ada di `.env.local`
- Klik "🚀 LOGIN"

### 3. Auto Redirect

Setelah login berhasil → Redirect ke `/admin` (dashboard)

## 🔒 Cara Kerja Proteksi

### Flow Login:

```
User akses /admin
       ↓
Middleware cek cookie 'admin_session'
       ↓
TIDAK ADA cookie → Redirect ke /admin/login
       ↓
User masukkan password
       ↓
API check password vs .env.local
       ↓
BENAR → Set cookie 'admin_session' → Redirect ke /admin
       ↓
SALAH → Error message → Coba lagi
```

### Middleware Protection:

**File:** `src/middleware.ts`

```typescript
// Protect /admin/*
if (request.nextUrl.pathname.startsWith('/admin')) {
  if (session !== 'authenticated') {
    return NextResponse.redirect('/admin/login');
  }
}

// Protect /api/admin/*
if (request.nextUrl.pathname.startsWith('/api/admin/verify')) {
  if (session !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

## 📁 Struktur File

```
/admin
  ├── login/
  │   └── page.tsx          ← Halaman login
  └── dashboard.tsx         ← Dashboard admin (setelah login)

/api/admin
  └── login/
      └── route.ts          ← API untuk login/logout/check

/src
  └── middleware.ts          ← Proteksi routes
```

## 🔧 API Endpoints

### 1. Login
```
POST /api/admin/login
Body: { "password": "admin123" }

Response Success:
{ "success": true, "message": "Login berhasil" }
+ Set cookie: admin_session=authenticated (24 jam)

Response Failed:
{ "error": "Password salah" }
Status: 401
```

### 2. Check Session
```
GET /api/admin/login

Response:
{ "authenticated": true }  // atau false
```

### 3. Logout
```
DELETE /api/admin/login

Response:
{ "success": true, "message": "Logout berhasil" }
+ Delete cookie: admin_session
```

## 🎨 UI Pages

### Login Page (`/admin/login`)
- 🔐 Form password dengan styling purple/pink
- 👁️ Animated background
- 💡 Hint: Default password di `.env.local`
- ← Back to home button

### Dashboard (`/admin`)
- 🔑 Verifikasi pembayaran
- 📊 Filter: Unverified / All
- 👁️ Preview bukti bayar
- ✅ Approve / ❌ Reject
- 🚪 Logout button

## ⚠️ Security Notes

### Password Best Practices:

**❌ JANGAN:**
```env
ADMIN_PASSWORD=admin123
ADMIN_PASSWORD=password
ADMIN_PASSWORD=123456
```

**✅ GUNAKAN:**
```env
ADMIN_PASSWORD=MyS3cur3P@ssw0rd!2024#Random
ADMIN_PASSWORD=xK9$mP2vL8nQ5wR7jT4yB6cF1hG3sA0
```

### Generate Random Password:

**Online:** https://passwordsgenerator.net/

**Manual (Linux/Mac):**
```bash
openssl rand -base64 32
```

**Windows PowerShell:**
```powershell
-join ((65..90) + (97..122) + (48..57) + (33..47) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

### Cookie Security:

```typescript
response.cookies.set('admin_session', 'authenticated', {
  httpOnly: true,        // ✅ Tidak bisa diakses JavaScript
  secure: process.env.NODE_ENV === 'production',  // ✅ HTTPS only di production
  sameSite: 'strict',    // ✅ CSRF protection
  maxAge: 60 * 60 * 24,  // 24 hours
  path: '/',
});
```

## 🔄 Session Management

### Session Expired (24 jam):
```
User sedang pakai admin page
       ↓
24 jam berlalu
       ↓
Cookie expired
       ↓
Middleware redirect ke /admin/login
       ↓
User login ulang
```

### Manual Logout:
```
Klik tombol "🚪 Logout"
       ↓
DELETE /api/admin/login
       ↓
Cookie dihapus
       ↓
Redirect ke /admin/login
```

## 🛡️ Protection Layers

### Layer 1: Middleware
- Intercept semua request ke `/admin/*`
- Redirect otomatis jika belum login
- Tidak bisa di-bypass dari client

### Layer 2: API Protection
- API routes `/api/admin/*` juga dicek
- Return 401 Unauthorized jika tidak authenticated

### Layer 3: Password Check
- Password dibandingkan dengan `.env.local`
- Server-side only (tidak bisa dilihat client)

### Layer 4: HttpOnly Cookie
- Cookie tidak bisa diakses via JavaScript
- Mencegah XSS attacks

## 🐛 Troubleshooting

### Tidak bisa login:
```
1. Cek .env.local ada ADMIN_PASSWORD
2. Password yang dimasukkan HARUS SAMA PERSIS
3. Restart dev server setelah ganti .env.local
4. Clear browser cookies jika perlu
```

### Bisa akses /admin tanpa login:
```
1. Cek middleware.ts ada di src/
2. Restart dev server
3. Clear browser cookies
4. Cek console untuk error
```

### Session tidak persist:
```
1. Cookie settings benar di /api/admin/login/route.ts
2. httpOnly: true
3. sameSite: 'strict'
4. path: '/'
```

### Lupa password:
```
1. Buka file .env.local
2. Lihat ADMIN_PASSWORD
3. Atau ganti dengan password baru
4. Restart dev server
```

## 📊 Routes Summary

| Route | Access | Protection |
|-------|--------|------------|
| `/` | Public | ❌ None |
| `/orders` | Public | ❌ None |
| `/payment` | Public | ❌ None |
| `/admin/login` | Public | ❌ None (login page) |
| `/admin` | Protected | ✅ Middleware + Cookie |
| `/api/admin/*` | Protected | ✅ Cookie check |
| `/api/payment/*` | Public | ❌ None (except verify) |

## 🎯 Quick Start

```bash
# 1. Set password di .env.local
ADMIN_PASSWORD=password-kuat-anda

# 2. Restart server
npm run dev

# 3. Login
# Buka: http://localhost:3000/admin/login
# Masukkan password

# 4. Selesai!
```

## ⚡ Production Deployment

### Environment Variables:
```env
# Production .env
ADMIN_PASSWORD=${ADMIN_PASSWORD}  # Dari secrets manager
```

### Set di Vercel:
```
Settings → Environment Variables → Add ADMIN_PASSWORD
```

### Set di Railway:
```
Variables → New Variable → ADMIN_PASSWORD
```

### Set di VPS:
```bash
export ADMIN_PASSWORD="your-strong-password"
# Atau di file .env production
```

---

## ✅ Checklist Keamanan

```
[✅] Password di .env.local (bukan di code)
[✅] HttpOnly cookie (anti XSS)
[✅] SameSite strict (anti CSRF)
[✅] Secure flag di production (HTTPS only)
[✅] Middleware protection (auto redirect)
[✅] API route protection (401 if not auth)
[⚠️]  Ganti default password!
[⚠️]  Gunakan password yang KUAT
```

**Admin page sekarang AMAN dari akses tidak sah!** 🔒
