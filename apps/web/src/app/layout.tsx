import React from 'react';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { SessionProvider } from '@/auth/sessionStore';
import './globals.css';

export const metadata = {
  title: "Apex Field Solutions - Core FSM Platform",
  description: "Enterprise Dispatch, Invoicing, Equipment & Mobile Work Order Management",
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </head>
      <body className="min-h-screen bg-slate-50 antialiased font-sans">
        <QueryProvider>
          <SessionProvider>
            {children}
          </SessionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
