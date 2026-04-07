import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
