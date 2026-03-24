import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Zap, FileText, Truck, Receipt, CreditCard, BookOpen, Users } from 'lucide-react';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Soft Sauda ERP',
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
        <nav className="bg-slate-900 text-slate-300 flex-col w-full md:w-[240px] h-auto md:h-full border-b md:border-b-0 md:border-r border-slate-800 hidden md:flex shrink-0">
           <div className="p-6 font-bold text-xl text-white tracking-tight border-b border-slate-800 shadow-sm flex items-center gap-2">
             <Zap className="w-6 h-6 text-yellow-400 fill-yellow-400" /> Soft Sauda
           </div>
           <div className="flex-1 overflow-y-auto py-6 space-y-2 px-3 font-medium text-sm">
             <a href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
               <FileText className="w-5 h-5" /> Contracts (Sauda)
             </a>
             <a href="/parties" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
               <Users className="w-5 h-5" /> Parties Directory
             </a>
             <a href="/deliveries" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
               <Truck className="w-5 h-5" /> Deliveries
             </a>
             <a href="/bills" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
               <Receipt className="w-5 h-5" /> Billing & Outstd.
             </a>
             <a href="/payments" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
               <CreditCard className="w-5 h-5" /> Payments
             </a>
             <a href="/ledger" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
               <BookOpen className="w-5 h-5" /> Ledger
             </a>
           </div>
           
           <div className="p-4 border-t border-slate-800">
              <div className="text-xs text-slate-500 font-mono mb-1">USER: ADMIN</div>
              <div className="text-xs text-slate-500 font-mono">FY 2026-27 | v2.0</div>
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
