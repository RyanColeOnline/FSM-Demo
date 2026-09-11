import React from 'react';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { SessionProvider } from '@/auth/sessionStore';
import { TurbopackDevIndicatorRemover } from '@/components/dev/TurbopackDevIndicatorRemover';
import './globals.css';

export const metadata = {
  title: "FSM Demo",
  description: "Enterprise Dispatch, Invoicing, Equipment & Mobile Work Order Management",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    shortcut: '/favicon.svg',
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
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </head>
      <body className="min-h-screen bg-slate-50 antialiased font-sans">
        <QueryProvider>
          <SessionProvider>
            <TurbopackDevIndicatorRemover />
            {children}
          </SessionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
