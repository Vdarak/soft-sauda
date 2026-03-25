import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Zap, FileText, Truck, Receipt, CreditCard, BookOpen, Users, Box } from 'lucide-react';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GCC ERP',
  description: 'Enterprise Trading & Logistics ERP',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-100 text-slate-900 flex flex-col md:flex-row h-screen overflow-hidden`}>
        {/* Sidebar Nav */}
        <nav className="bg-sidebar text-sidebar-text flex-col w-full md:w-[240px] h-auto md:h-full border-b md:border-b-0 md:border-r border-sidebar-border hidden md:flex shrink-0">
          <div className="p-6 font-bold text-xl text-sidebar-text tracking-tight border-b border-sidebar-border shadow-sm flex flex-col justify-center items-center gap-3">
            <img src="/gcc-logo.svg" alt="GCC Logo" className="h-14 w-auto drop-shadow" />
            <span className="text-[10px] tracking-widest uppercase text-sidebar-muted">Enterprise ERP</span>
          </div>
          <div className="flex-1 overflow-y-auto py-6 space-y-2 px-3 font-medium text-sm">
            <a href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-hover text-sidebar-text transition-all">
              <FileText className="w-5 h-5" /> Contracts (Sauda)
            </a>
            <a href="/parties" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-hover text-sidebar-text transition-all">
              <Users className="w-5 h-5" /> Parties Directory
            </a>
            <a href="/commodities" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-hover text-sidebar-text transition-all">
              <Box className="w-5 h-5" /> Commodities
            </a>
            <a href="/deliveries" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-hover text-sidebar-text transition-all">
              <Truck className="w-5 h-5" /> Deliveries
            </a>
            <a href="/bills" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-hover text-sidebar-text transition-all">
              <Receipt className="w-5 h-5" /> Billing & Outstd.
            </a>
            <a href="/payments" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-hover text-sidebar-text transition-all">
              <CreditCard className="w-5 h-5" /> Payments
            </a>
            <a href="/ledger" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-hover text-sidebar-text transition-all">
              <BookOpen className="w-5 h-5" /> Ledger
            </a>
          </div>

          <div className="p-4 border-t border-sidebar-border">
            <div className="text-xs text-sidebar-muted font-mono mb-1">USER: ADMIN</div>
            <div className="text-xs text-sidebar-muted font-mono">FY 2026-27 | v2.0</div>
          </div>
        </nav>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto h-full w-full">
          {children}
        </div>
      </body>
    </html>
  );
}
