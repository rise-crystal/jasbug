import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { JakartaTimeWidget } from '@/components/jakarta-time-widget';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '⚠️ POWER BUG - Jasa Bug WhatsApp Terkuat & Terganas!',
  description: '🔥 Hancurkan Sistem WhatsApp Target! Bug paling ganas dan mematikan yang akan merusak sistem WhatsApp mereka secara permanen. Deploy sekarang hanya Rp 10.000!',
  openGraph: {
    title: '⚠️ POWER BUG - Jasa Bug WhatsApp Terkuat & Terganas!',
    description: '🔥 Bug WhatsApp paling mematikan! Akan merusak sistem WhatsApp target secara permanen. Deploy sekarang hanya Rp 10.000!',
    images: [
      {
        url: 'https://www.tarlogic.com/wp-content/uploads/2024/02/Tipos-de-malware-1200x900.webp',
        width: 1200,
        height: 900,
        alt: 'Power Bug - Senjata Digital Paling Mematikan',
      },
    ],
    type: 'website',
    locale: 'id_ID',
    siteName: 'Power Bug',
  },
  twitter: {
    card: 'summary_large_image',
    title: '⚠️ POWER BUG - Jasa Bug WhatsApp Terkuat & Terganas!',
    description: '🔥 Bug WhatsApp paling mematikan! Akan merusak sistem WhatsApp target secara permanen. Deploy sekarang hanya Rp 10.000!',
    images: ['https://www.tarlogic.com/wp-content/uploads/2024/02/Tipos-de-malware-1200x900.webp'],
  },
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🔥</text></svg>',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        {/* Open Graph / WhatsApp Preview */}
        <meta property="og:title" content="⚠️ POWER BUG - Jasa Bug WhatsApp Terkuat & Terganas!" />
        <meta property="og:description" content="🔥 Hancurkan Sistem WhatsApp Target! Bug paling ganas dan mematikan yang akan merusak sistem WhatsApp mereka secara permanen. Deploy sekarang hanya Rp 10.000!" />
        <meta property="og:image" content="https://www.tarlogic.com/wp-content/uploads/2024/02/Tipos-de-malware-1200x900.webp" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="900" />
        <meta property="og:image:alt" content="Power Bug - Senjata Digital Paling Mematikan" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="id_ID" />
        <meta property="og:site_name" content="Power Bug" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="⚠️ POWER BUG - Jasa Bug WhatsApp Terkuat & Terganas!" />
        <meta name="twitter:description" content="🔥 Hancurkan Sistem WhatsApp Target! Bug paling ganas dan mematikan yang akan merusak sistem WhatsApp mereka secara permanen. Deploy sekarang hanya Rp 10.000!" />
        <meta name="twitter:image" content="https://www.tarlogic.com/wp-content/uploads/2024/02/Tipos-de-malware-1200x900.webp" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <JakartaTimeWidget />
        {children}
      </body>
    </html>
  );
}
