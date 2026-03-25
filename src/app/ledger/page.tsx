import { db } from '@/db';
import { ledger } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { createJournalEntry } from '../actions/ledger';
import { BookOpen, TableProperties } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function LedgerPage() {
  let recentEntries: any[] = [];
  
  try {
    recentEntries = await db.select().from(ledger).orderBy(desc(ledger.id)).limit(30);
  } catch (err) {
    console.error("DB error:", err);
  }

  return (
    <main className="p-4 font-sans text-sm text-slate-800">
      <div className="max-w-screen-2xl mx-auto space-y-4">
        <header className="bg-slate-800 border-b border-slate-700 p-4 rounded-xl shadow flex justify-between items-center text-white">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Accounting Ledger</h1>
            <p className="text-slate-300 text-xs">General Journal Entries & Account Balances</p>
          </div>
        </header>

        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white shadow-md border border-slate-200 rounded-xl overflow-hidden flex flex-col h-fit">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
               <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900">
                 <BookOpen className="w-6 h-6 text-slate-600" /> Manual Journal Entry
               </h2>
            </div>
            <form action={createJournalEntry} className="p-6 space-y-5 flex-1 bg-white">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase">Account Header *</label>
                <input required name="accountId" type="text" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-slate-500" placeholder="e.g. ABC Trade Corp" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase">Txn Date</label>
                  <input name="transactionDate" type="date" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-slate-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase">Voucher Ref</label>
                  <input name="voucherRef" type="number" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-slate-500 font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase">Entry Type *</label>
                  <select required name="type" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-slate-500">
                     <option value="debit">Debit (Dr)</option>
                     <option value="credit">Credit (Cr)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase">Amount *</label>
                  <input required name="amount" type="number" step="0.01" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-slate-500 font-mono" placeholder="0.00" />
                </div>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <label className="block text-xs font-bold text-slate-600 uppercase">Narration</label>
                <textarea name="narration" rows={3} className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-slate-500" placeholder="Being payment received via..." />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                 <button type="submit" className="w-full py-2.5 bg-slate-800 text-white font-bold rounded shadow hover:bg-slate-900 active:scale-95 transition-all">
                   Post to Ledger
                 </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-8 bg-white shadow-md border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
               <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900">
                 <TableProperties className="w-6 h-6 text-slate-600" /> General Ledger (GL)
               </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-xs">Date</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-xs">Ref/Vch</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-xs">Account & Narration</th>
                    <th className="px-4 py-3 text-right font-bold text-red-600 uppercase text-xs">Debit (Dr)</th>
                    <th className="px-4 py-3 text-right font-bold text-emerald-600 uppercase text-xs">Credit (Cr)</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-600 uppercase text-xs">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {recentEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">No journal entries posted.</td>
                    </tr>
                  ) : recentEntries.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-500 text-xs">{e.transactionDate ? new Date(e.transactionDate).toISOString().split('T')[0] : '-'}</td>
                      <td className="px-4 py-3 font-mono text-slate-400 text-xs">{e.sourceId || '-'}</td>
                      <td className="px-4 py-3">
                         <div className="font-bold text-slate-800">{e.accountId}</div>
                         <div className="text-slate-500 text-xs mt-1 italic">{e.narration}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-red-700">{Number(e.debit) > 0 ? `₹${Number(e.debit).toFixed(2)}` : ''}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-700">{Number(e.credit) > 0 ? `₹${Number(e.credit).toFixed(2)}` : ''}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/ledger/${e.id}`} className="text-slate-700 font-bold hover:underline text-xs bg-slate-100 px-3 py-1.5 rounded border border-slate-200">Edit</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
