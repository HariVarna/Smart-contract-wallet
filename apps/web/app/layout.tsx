import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Smart Contract Wallet | Non-Custodial Account Abstraction',
  description: 'Production-oriented, non-custodial Smart Contract Wallet built on EVM',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090d16] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        <div className="relative min-h-screen flex flex-col justify-between overflow-x-hidden">
          <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
          {children}
        </div>
      </body>
    </html>
  );
}
