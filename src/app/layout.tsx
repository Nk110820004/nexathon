import type { Metadata } from 'next';
import './globals.css';
import { UserProvider } from '@/context/UserContext';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'PoseParfaite & Healthyfy',
  description: 'Sleek Next-generation AI Trainer, Calorie Tracker & Real-Time Community Chat',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-brand-dark-950 text-slate-100 antialiased font-sans">
        <UserProvider>
          <div className="flex flex-col md:flex-row min-h-screen">
            <Sidebar />
            <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
              <div className="flex-1 p-4 md:p-8 animate-fade-in">
                {children}
              </div>
            </main>
          </div>
        </UserProvider>
      </body>
    </html>
  );
}
