import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import '@/styles/components.css';
import '@/styles/animations.css';
import { ClientProviders } from './providers';

export const metadata: Metadata = {
  title: 'Personal Manager — Your Personal Operating System',
  description: 'Manage tasks, habits, expenses, vehicles, documents, wardrobe, businesses, and more from a single mobile-first app.',
  keywords: ['personal manager', 'task manager', 'expense tracker', 'habit tracker', 'pwa'],
  authors: [{ name: 'Personal Manager' }],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Personal Manager',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#07070d' },
    { media: '(prefers-color-scheme: light)', color: '#f8f8fc' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
