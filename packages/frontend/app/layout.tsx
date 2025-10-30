import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../contexts/AuthContext';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Betwise - Sports Predictions & Referral SaaS',
  description: 'Get premium sports predictions and earn through referrals',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={[
          inter.className,
          'antialiased',
          // Фон с фини градиенти за по-“жив” UI (работи и в dark)
          "bg-[radial-gradient(1200px_800px_at_100%_-200px,rgba(99,102,241,0.08),transparent),radial-gradient(800px_600px_at_-100px_120%,rgba(16,185,129,0.08),transparent)]",
          "dark:bg-[radial-gradient(1200px_800px_at_100%_-200px,rgba(99,102,241,0.15),transparent),radial-gradient(800px_600px_at_-100px_120%,rgba(16,185,129,0.12),transparent)]",
          'min-h-screen',
        ].join(' ')}
      >
        <Providers>
          <AuthProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                className:
                  'bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-800',
              }}
            />
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}