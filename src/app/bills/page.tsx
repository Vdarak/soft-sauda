import { db } from '@/db';
import { bills, parties, ledger } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { Receipt, Plus, Search, Layers, Printer, Banknote } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function BillsPage() {
  let enrichedBills: any[] = [];
  let ledgerStats = { totalDebit: 0, totalCredit: 0 };
  
  try {
    const rawBills = await db.select().from(bills).orderBy(desc(bills.id)).limit(50);
    
    for (const b of rawBills) {
      let partyName = 'UNKNOWN Party';
      if (b.partyId) {
        const pQuery = await db.select({ name: parties.name }).from(parties).where(eq(parties.id, b.partyId)).limit(1);
        if (pQuery.length > 0) partyName = pQuery[0].name;
      }
      
      enrichedBills.push({
        ...b,
        partyName,
      });
    }

    // Advanced SQL Aggregation via Drizzle to summarize double-entry ledger totals
    const agg = await db.select({
       totalDebit: sql<number>`SUM(${ledger.debit})`,
       totalCredit: sql<number>`SUM(${ledger.credit})`,
    }).from(ledger);
    
    if (agg.length > 0) {
      ledgerStats.totalDebit = Number(agg[0].totalDebit) || 0;
      ledgerStats.totalCredit = Number(agg[0].totalCredit) || 0;
    }

  } catch (err) {
    console.error("DB error fetching bills:", err);
  }

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-sm text-slate-800">
      <div className="max-w-screen-2xl mx-auto p-4 space-y-6 flex flex-col h-screen">
        
        {/* Header Ribbon */}
        <header className="bg-white border-b border-slate-200 px-6 py-5 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Billing & Ledger Hub</h1>
              <p className="text-slate-500 text-sm">Issue commercial bills and review double-entry accounts</p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search invoices..." 
                className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-lg outline-none transition-all"
              />
            </div>
            <Link 
              href="/bills/generate"
              className="px-4 py-2 border border-orange-200 text-orange-700 font-semibold flex items-center gap-2 rounded-lg bg-orange-50 hover:bg-orange-100 transition-all active:scale-95 whitespace-nowrap"
            >
              <Layers className="w-4 h-4" /> Bulk Utility
            </Link>
            <Link 
              href="/bills/new"
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold flex items-center gap-2 rounded-lg shadow-sm transition-all active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Issue Bill
            </Link>
          </div>
        </header>

        {/* Top Ledger Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Receivables (Db)</p>
                 <span className="text-2xl font-black text-rose-600 font-mono">₹{ledgerStats.totalDebit.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-rose-50 rounded-full border border-rose-100">
                 <Layers className="w-6 h-6 text-rose-500" />
              </div>
           </div>
           <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Payables (Cr)</p>
                 <span className="text-2xl font-black text-emerald-600 font-mono">₹{ledgerStats.totalCredit.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-full border border-emerald-100">
                 <Banknote className="w-6 h-6 text-emerald-500" />
              </div>
           </div>
           <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-xl border border-slate-700 shadow flex items-center justify-between text-white">
              <div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Net Balance</p>
                 <span className="text-2xl font-black text-white font-mono">₹{(ledgerStats.totalDebit - ledgerStats.totalCredit).toLocaleString()}</span>
              </div>
              <div className="p-3 bg-white/10 rounded-full border border-white/10">
                 <Receipt className="w-6 h-6 text-white" />
              </div>
           </div>
        </div>

        {/* Detailed Bill Grid */}
        <div className="flex-1 bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 p-4">
             <h2 className="text-sm font-bold flex items-center gap-2 text-slate-900 uppercase tracking-wider">
               <Receipt className="w-4 h-4 text-slate-500" /> Issued Invoices / Bills
             </h2>
          </div>
          <div className="overflow-x-auto flex-1 h-full">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-white sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-xs tracking-wider">Invoice Details</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-xs tracking-wider">Billed To (Debit A/C)</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-xs tracking-wider">Basis</th>
                  <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase text-xs tracking-wider">Invoice Value</th>
                  <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase text-xs tracking-wider">Pending Balance</th>
                  <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase text-xs tracking-wider">Terms</th>
                  <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase text-xs tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {enrichedBills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                       <Receipt className="w-12 h-12 text-slate-200" />
                       <p>No bills issued yet.</p>
                       <Link href="/bills/new" className="text-orange-600 font-semibold hover:underline mt-2">Generate your first invoice</Link>
                    </td>
                  </tr>
                ) : enrichedBills.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                         <span className="font-mono bg-orange-50 text-orange-700 px-2.5 py-1 rounded text-xs border border-orange-200 shadow-sm">{b.billNo}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 font-bold">Dated: {b.billDate?.toISOString().split('T')[0]}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-800 text-sm">{b.partyName}</div>
                      <a href="#" className="text-[10px] uppercase font-bold text-blue-600 hover:underline">View Party Ledger &rarr;</a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-widest">{b.basis}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="font-mono font-bold text-slate-900 text-sm">₹ {Number(b.totalAmount).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {Number(b.balanceAmount) === 0 ? (
                         <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs">PAID</span>
                      ) : (
                         <span className="font-mono font-bold text-rose-600">₹ {Number(b.balanceAmount).toLocaleString()}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                       <span className="text-[11px] text-slate-500 font-bold bg-slate-50 px-2 py-1 rounded border border-slate-200">
                          {b.creditDays || '0'} Days
                       </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link href={`/bills/${b.id}`} className="text-orange-700 font-bold hover:underline text-xs bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100">Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
