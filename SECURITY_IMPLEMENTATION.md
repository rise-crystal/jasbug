# 🔒 Security Implementation Guide

## ✅ Yang Sudah Diimplementasikan

### 1. Security Headers (next.config.ts)
✅ Content Security Policy (CSP)
✅ X-Frame-Options: DENY (anti clickjacking)
✅ X-Content-Type-Options: nosniff
✅ X-XSS-Protection: 1; mode=block
✅ Strict-Transport-Security (HSTS)
✅ Referrer-Policy: strict-origin-when-cross-origin
✅ Permissions-Policy (disable camera, mic, geo)
✅ Powered-by header disabled

### 2. Rate Limiting (middleware.ts)
✅ 100 requests per 15 minutes per IP
✅ Auto-block dengan response 429 Too Many Requests
✅ Rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining)
✅ Retry-After header saat exceeded

### 3. Input Validation (src/lib/security.ts)
✅ Phone number validation (Zod schema)
✅ Order ID validation (UUID atau SQID format)
✅ File upload validation (type, size)
✅ HTML escape untuk XSS prevention
✅ Secure filename generation untuk uploads
✅ CSRF token generation & verification
✅ Sensitive data masking untuk logs

### 4. Session Security
✅ HttpOnly cookies (tidak bisa diakses JavaScript)
✅ Secure flag (HTTPS only di production)
✅ SameSite: strict (anti CSRF)
✅ 24-hour expiry dengan auto-logout

### 5. Admin Access Control
✅ Middleware protection untuk /admin routes
✅ Auto-redirect ke /admin/login jika belum authenticated
✅ Password-based authentication
✅ Session management dengan cookies

### 6. File Upload Security
✅ Validasi file type (hanya gambar & PDF)
✅ Max size 5MB
✅ Secure filename generation (timestamp + random)
✅ Extension whitelist
✅ Simpan di Supabase Storage (bukan public folder)

### 7. Database Security
✅ Supabase service role key (server-side only)
✅ Row Level Security (RLS) policies
✅ Parameterized queries (via Supabase client)
✅ No raw SQL injection vectors

### 8. Dependencies
✅ 0 vulnerabilities (npm audit clean)
✅ Next.js 15.1.8 (latest stable)
✅ React 19 (latest)

---

## 📋 Security Checklist

### ✅ Production Ready:
- [x] Security headers configured
- [x] Rate limiting enabled
- [x] Input validation on all forms
- [x] XSS protection (CSP + escape)
- [x] CSRF protection (SameSite cookies)
- [x] Clickjacking protection (X-Frame-Options)
- [x] Secure session management
- [x] File upload validation
- [x] Admin access control
- [x] Error handling (no sensitive data leak)
- [x] Dependencies audit (0 vulnerabilities)
- [x] Environment variables (.env.local)

### ⚠️ Untuk Production Deployment:
- [ ] Gunakan HTTPS (SSL/TLS certificate)
- [ ] Setup Cloudflare (DDoS protection)
- [ ] Gunakan Redis untuk rate limiting (bukan in-memory)
- [ ] Implement logging & monitoring
- [ ] Setup backup database otomatis
- [ ] Rotate API keys secara berkala
- [ ] Enable 2FA untuk admin
- [ ] Setup WAF (Web Application Firewall)
- [ ] Penetration testing sebelum go-live

---

## 🛡️ Best Practices

### 1. Environment Variables
```env
# JANGAN commit .env.local ke Git!
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=... (KEEP SECRET!)
ADMIN_PASSWORD=... (USE STRONG PASSWORD!)
QRIS_STATIC_CODE=...
```

### 2. Password Admin
```bash
# Generate strong password
openssl rand -base64 32
# atau
pwgen -s 32 1
```

### 3. Database Access
- ✅ Gunakan Supabase service role key HANYA di server-side
- ✅ Jangan expose service key di client-side code
- ✅ Enable RLS untuk semua tabel
- ✅ Create restrictive policies per role

### 4. File Uploads
```typescript
// Validasi di server-side (JANGAN trust client)
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const maxSize = 5 * 1024 * 1024; // 5MB

if (!allowedTypes.includes(file.type) || file.size > maxSize) {
  return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
}
```

### 5. API Security
```typescript
// Selalu validate input
const validated = schema.safeParse(input);
if (!validated.success) {
  return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
}

// Rate limit per endpoint
const { success } = await checkRateLimit(loginLimiter, ip);
if (!success) {
  return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
}
```

---

## 🔧 Tools yang Direkomendasikan

### Development:
1. **npm audit** - Check vulnerabilities
2. **ESLint security plugin** - Static analysis
3. **Burp Suite Community** - Penetration testing
4. **OWASP ZAP** - Security scanner

### Production:
1. **Cloudflare** - DDoS protection & WAF
2. **Sentry** - Error monitoring
3. **LogRocket** - Session replay & monitoring
4. **Dependabot** - Auto dependency updates

### Testing:
```bash
# Audit dependencies
npm audit

# Check for outdated packages
npm outdated

# Run security linter
npm run lint

# Test with OWASP ZAP
# https://www.zaproxy.org/
```

---

## 🚀 Deployment Checklist

### Before Deploy:
```bash
# 1. Audit dependencies
npm audit

# 2. Build production
npm run build

# 3. Test all features manually
# - Order creation
# - Payment upload
# - Admin verification
# - Admin delete orders

# 4. Check environment variables
cat .env.local | grep -v "^#" | wc -l

# 5. Remove console.log (production)
# Or use logging service

# 6. Enable HTTPS
# 7. Setup Cloudflare
# 8. Setup database backups
# 9. Monitor logs
# 10. Test rate limiting
```

### Environment Variables Production:
```env
# Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eye...
SUPABASE_SERVICE_ROLE_KEY=ey... (SECRET!)

# Admin
ADMIN_PASSWORD=GenerateStrongPassword32Chars!

# QRIS
QRIS_STATIC_CODE=YourMerchantQRISCode

# Optional: Monitoring
SENTRY_DSN=https://...
```

---

## 📊 Security Headers Explained

| Header | Value | Protection |
|--------|-------|------------|
| **Content-Security-Policy** | Restrict sources | XSS, data injection |
| **X-Frame-Options** | DENY | Clickjacking |
| **X-Content-Type-Options** | nosniff | MIME sniffing |
| **X-XSS-Protection** | 1; mode=block | XSS attacks |
| **Strict-Transport-Security** | max-age=63072000 | MITM attacks |
| **Referrer-Policy** | strict-origin | Info leakage |
| **Permissions-Policy** | camera=(), mic=() | Unauthorized access |

---

## ⚠️ Common Attack Vectors & Protection

### 1. SQL Injection
✅ **Protected**: Supabase client uses parameterized queries
✅ **Validation**: Zod schemas untuk semua input

### 2. XSS (Cross-Site Scripting)
✅ **Protected**: Content Security Policy
✅ **Protected**: React auto-escapes output
✅ **Protected**: escapeHtml() utility

### 3. CSRF (Cross-Site Request Forgery)
✅ **Protected**: SameSite=strict cookies
✅ **Protected**: Custom CSRF tokens (available in security.ts)

### 4. Brute Force
✅ **Protected**: Rate limiting (100 req/15min)
✅ **Protected**: Admin password protection

### 5. File Upload Attacks
✅ **Protected**: File type validation
✅ **Protected**: Size limit (5MB)
✅ **Protected**: Secure filename generation
✅ **Protected**: Extension whitelist

### 6. DDoS
⚠️ **Partial**: Rate limiting in-memory
⚠️ **Recommended**: Cloudflare for production

---

## 📝 Monitoring & Logging

### What to Log:
```typescript
// ✅ Safe to log
- Order creation (without phone numbers)
- Payment uploads (success/fail)
- Admin login attempts
- Rate limit violations
- Database errors (without credentials)

// ❌ NEVER log
- Passwords
- API keys
- Service keys
- Full phone numbers
- Credit card data
```

### Example Logging:
```typescript
import { maskSensitiveData } from '@/lib/security';

// Good
console.log('Order created:', maskSensitiveData(orderId));

// Bad
console.log('Order:', order); // May contain sensitive data
```

---

## 🎯 Next Steps (Post-Launch)

1. **Setup Monitoring**
   - Sentry for error tracking
   - Uptime monitoring (UptimeRobot)
   - Log aggregation

2. **Regular Maintenance**
   - Weekly: npm audit
   - Monthly: Update dependencies
   - Quarterly: Penetration test
   - Yearly: Security audit

3. **Incident Response**
   - Have backup strategy
   - Document rollback procedure
   - Keep contact info for hosting provider

---

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [Supabase Security](https://supabase.com/docs/guides/database/security)
- [CSP Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

**Last Updated**: 2026-04-06
**Security Level**: High (Production-Ready)
**Audit Status**: ✅ Clean (0 vulnerabilities)
