import type { Metadata } from 'next';
import './globals.css';
import { ReduxProvider } from '../store/Provider';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Issue Tracker — Collaborative Project Management',
  description: 'A Jira-like collaborative issue tracker built with Next.js and Redux Toolkit',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ReduxProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: '#fff',
                color: '#1e293b',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600,
                fontSize: 14,
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
                padding: '12px 16px',
              },
              success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </ReduxProvider>
      </body>
    </html>
  );
}
