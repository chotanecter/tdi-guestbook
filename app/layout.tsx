import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import AnalyticsBeacon from '@/components/AnalyticsBeacon';

export const metadata: Metadata = {
  title: 'Technically Doing It — Guestbook',
  description: 'A digital yearbook of moments. Tap an NFC tag, leave your mark.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Technically Doing It';

  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        <header className="border-b border-black/10 bg-white/70 backdrop-blur sticky top-0 z-20">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="font-display font-bold text-lg">
              {siteName}
            </Link>
            <Link
              href="/post"
              className="text-sm font-medium bg-black text-white px-4 py-2 rounded-full hover:bg-neutral-800 transition"
            >
              Leave a mark
            </Link>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
        <footer className="max-w-2xl mx-auto px-4 py-12 text-center text-xs text-neutral-500">
          © {new Date().getFullYear()} {siteName} · A digital yearbook
        </footer>
        <AnalyticsBeacon />
      </body>
    </html>
  );
}
