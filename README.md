# Jasbug - Power Bug Deployment System 🚀

A modern web application for deploying digital products with QRIS payment integration, admin verification, and real-time order tracking.

## ✨ Features

- 🔐 **Admin Dashboard** - Verify payments, manage orders
- 💳 **QRIS Payment** - Dynamic QR code generation
- 📸 **Payment Proof Upload** - Manual transfer with admin verification
- 📊 **Real-time Updates** - Live order status via Supabase
- 🔒 **Security** - Rate limiting, input validation, CSP headers
- 📱 **Responsive** - Mobile-friendly interface

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Cookie-based session
- **Payment**: QRIS dynamic code generation

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

```bash
# Clone repository
git clone https://github.com/rise-crystal/jasbug.git
cd jasbug

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local dengan konfigurasi Anda

# Run development server
npm run dev
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ADMIN_PASSWORD=your_strong_password
QRIS_STATIC_CODE=your_qris_code
```

## 📁 Project Structure

```
jasbug/
├── src/
│   ├── app/                 # Next.js pages
│   │   ├── admin/          # Admin dashboard
│   │   ├── orders/         # Public orders page
│   │   ├── payment/        # Payment page
│   │   └── api/            # API routes
│   └── lib/                # Utilities & helpers
├── supabase/               # Database migrations
├── public/                 # Static assets
└── README.md
```

## 📊 Pages

| Page | Description | Access |
|------|-------------|--------|
| `/` | Home & order creation | Public |
| `/orders` | View all orders | Public |
| `/payment` | Payment & QR code | Public |
| `/admin` | Payment verification | Admin only |
| `/admin/orders` | Manage all orders | Admin only |
| `/admin/login` | Admin login | Public |

## 🔒 Security Features

- ✅ Content Security Policy (CSP)
- ✅ Rate limiting (100 req/15min)
- ✅ Input validation (Zod schemas)
- ✅ XSS protection
- ✅ CSRF protection (SameSite cookies)
- ✅ Clickjacking protection
- ✅ File upload validation
- ✅ HttpOnly session cookies

## 📦 Database Setup

Run these migrations in Supabase SQL Editor:

1. `supabase/001_create_orders_table.sql`
2. `supabase/003_add_qris_payment_columns.sql`
3. `supabase/005_setup_payment_proof_storage.sql`
4. `supabase/006_custom_order_id.sql`
5. `supabase/007_add_bug_tracking.sql`

## 🚀 Deployment

### Build for Production

```bash
npm run build
npm start
```

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `./upload.sh` or `upload.bat` - Push to GitHub

## 🔧 Available Commands

### Linux/Mac
```bash
chmod +x upload.sh
./upload.sh
```

### Windows
```cmd
upload.bat
```

## 📖 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/payment/qris` | POST | Generate QRIS code |
| `/api/payment/status/[orderId]` | GET/PUT | Check/update payment status |
| `/api/payment/upload-proof` | POST | Upload payment proof |
| `/api/payment/verify/[orderId]` | PUT | Admin verification |
| `/api/payment/webhook` | POST | Payment webhook |
| `/api/admin/login` | POST/DELETE | Admin authentication |

## 🛡️ Security Checklist

- [x] Security headers
- [x] Rate limiting
- [x] Input validation
- [x] XSS protection
- [x] CSRF protection
- [x] Secure session management
- [x] File upload security
- [x] Environment variables
- [x] Dependencies audit (0 vulnerabilities)

## 📄 License

MIT License - see LICENSE file for details

## 👥 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support, open an issue in the repository or contact the development team.

---

**Made with ❤️ using Next.js & Supabase**
