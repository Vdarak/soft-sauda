import { db } from '@/db';
import { contracts, parties, deliveries } from '@/db/schema';
import { Box, FileText, Users, Receipt, TrendingUp, Archive, Building2, MapPin } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let metrics = { parties: 0, contracts: 0, deliveries: 0 };
  let dbError = false;

  try {
    // Basic dashboard metrics via count() in Drizzle could be done, or length on explicit fetches for small phases
    const p = await db.select({ id: parties.id }).from(parties).limit(100);
    const c = await db.select({ id: contracts.id }).from(contracts).limit(100);
    const d = await db.select({ id: deliveries.id }).from(deliveries).limit(100);
    metrics = { parties: p.length, contracts: c.length, deliveries: d.length };
  } catch (err) {
    console.error("DB connection error:", err);
    dbError = true;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 font-sans text-sm text-slate-800">
      {dbError && (
        <div className="max-w-7xl mx-auto mb-4 p-4 bg-red-100 border border-red-300 rounded-lg text-red-800">
          <h3 className="font-bold text-lg">Database Connection Failed</h3>
          <p className="mt-1">Please ensure PostgreSQL is running natively via Neon/Railway or locally with valid credentials mapped securely.</p>
        </div>
      )}

      <div className="max-w-screen-2xl mx-auto space-y-8">
        {/* Modern ERP Dashboard Header */}
        <header className="bg-gradient-to-r from-blue-900 to-indigo-900 border-b border-blue-800 p-6 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center text-white gap-4 relative overflow-hidden">
          <div className="absolute bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
          <div className="relative z-10 flex items-center gap-4 rounded-2xl p-4 pr-6">
            <img src="/gcc-logo.svg" alt="GCC Logo" className="h-16 w-auto" />
            <div className="hidden sm:block">
              <h1 className="text-3xl font-black tracking-tight text-white">GCC ERP</h1>
              <p className="text-brand-100 text-sm font-medium mt-1 uppercase tracking-wider">Enterprise Trading & Logistics Platform</p>
            </div>
          </div>
          <div className="relative z-10 flex gap-4 w-full md:w-auto">
            <div className="px-4 py-2 bg-blue-950/50 backdrop-blur rounded-lg text-xs font-mono font-bold border border-blue-800 flex items-center shadow-inner">FY: 2026-27</div>
          </div>
        </header>

        {/* Modular Navigation Grid */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">

          <Link href="/parties" className="group bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl border border-slate-200 hover:border-indigo-300 transition-all flex flex-col justify-between min-h-[160px]">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8" />
              </div>
              <span className="text-3xl font-black text-slate-200 group-hover:text-indigo-100 transition-colors">{metrics.parties}</span>
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">Party Directory</h3>
              <p className="text-slate-500 mt-1">Manage network accounts & master data</p>
            </div>
          </Link>

          <Link href="/commodities" className="group bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl border border-slate-200 hover:border-indigo-300 transition-all flex flex-col justify-between min-h-[160px]">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
                <Box className="w-8 h-8" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">Commodity Master</h3>
              <p className="text-slate-500 mt-1 line-clamp-2">Manage tradable products and HSN codes</p>
            </div>
          </Link>

          <Link href="/contracts" className="group bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl border border-slate-200 hover:border-blue-300 transition-all flex flex-col justify-between min-h-[160px]">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                <FileText className="w-8 h-8" />
              </div>
              <span className="text-3xl font-black text-slate-200 group-hover:text-blue-100 transition-colors">{metrics.contracts}</span>
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">Sauda Register</h3>
              <p className="text-slate-500 mt-1">Draft executing contracts and trade pricing</p>
            </div>
          </Link>

          <Link href="/deliveries" className="group bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl border border-slate-200 hover:border-emerald-300 transition-all flex flex-col justify-between min-h-[160px]">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                <Box className="w-8 h-8" />
              </div>
              <span className="text-3xl font-black text-slate-200 group-hover:text-emerald-100 transition-colors">{metrics.deliveries}</span>
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">Dispatch Logic</h3>
              <p className="text-slate-500 mt-1">Weighbridges, tracking, & logistics transit</p>
            </div>
          </Link>

          <Link href="/bills" className="group bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl border border-slate-200 hover:border-orange-300 transition-all flex flex-col justify-between min-h-[160px]">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
                <Receipt className="w-8 h-8" />
              </div>
              <span className="text-3xl font-black text-slate-200 group-hover:text-orange-100 transition-colors">-</span>
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">Financial Ledger</h3>
              <p className="text-slate-500 mt-1">Bills, automatic deductions, & receipts</p>
            </div>
          </Link>

        </section>

        {/* Global Summary Log Stream Placeholder */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center justify-center text-slate-400 h-64 border-dashed">
          <div className="flex flex-col items-center gap-2">
            <Archive className="w-8 h-8 text-slate-300" />
            <p className="font-medium text-slate-500">Analytics and System Graph Will Generate Here</p>
          </div>
        </section>

      </div>
    </main>
  );
}
