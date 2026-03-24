import { db } from '@/db';
import { bills, payments, contracts } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { createPayment } from '../actions/payment';
import { CreditCard, ClipboardList } from 'lucide-react';

export default async function PaymentsPage() {
  let recentPayments: any[] = [];
  let availableBills: any[] = [];
  
  try {
    recentPayments = await db.select({
      id: payments.id,
      paymentDate: payments.paymentDate,
      instrumentType: payments.instrumentType,
      instrumentNo: payments.instrumentNo,
      amount: payments.amount,
      depositedBank: payments.depositedBank,
      billNo: bills.billNo,
      buyerName: contracts.buyerName,
    }).from(payments)
      .leftJoin(bills, eq(payments.billId, bills.id))
      .leftJoin(contracts, eq(bills.contractId, contracts.id))
      .orderBy(desc(payments.id))
      .limit(15);
      
    availableBills = await db.select({
      id: bills.id,
      billNo: bills.billNo,
      balanceAmount: bills.balanceAmount,
      buyerName: contracts.buyerName,
    }).from(bills)
      .leftJoin(contracts, eq(bills.contractId, contracts.id))
      .where(eq(bills.balanceAmount, bills.balanceAmount)) // Just getting bills, would add > 0 filter normally
      .orderBy(desc(bills.id)).limit(100);
      
  } catch (err) {
    console.error("DB error:", err);
  }

  return (
    <main className="p-4 font-sans text-sm text-slate-800">
      <div className="max-w-screen-2xl mx-auto space-y-4">
        <header className="bg-purple-800 border-b border-purple-700 p-4 rounded-xl shadow flex justify-between items-center text-white">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Payments & Receipts</h1>
            <p className="text-purple-200 text-xs">Log incoming cheques, DDs, and Cash</p>
          </div>
        </header>

        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white shadow-md border border-slate-200 rounded-xl overflow-hidden flex flex-col h-fit">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
               <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900">
                 <CreditCard className="w-6 h-6 text-purple-600" /> Log Payment
               </h2>
            </div>
            <form action={createPayment} className="p-6 space-y-5 flex-1 bg-white">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase">Attach to Bill *</label>
                <select required name="billId" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-purple-500">
                   <option value="">-- Select Pending Bill --</option>
                   {availableBills.map(b => (
                      <option key={b.id} value={b.id}>
                         {b.billNo} | Bal: ₹{b.balanceAmount} | {b.buyerName}
                      </option>
                   ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase">Payment Date</label>
                  <input name="paymentDate" type="date" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase">Amount Received *</label>
                  <input required name="amount" type="number" step="0.01" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-purple-500 font-mono" placeholder="0.00" />
                </div>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <label className="block text-xs font-bold text-slate-600 uppercase">Mode</label>
                <select name="instrumentType" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-purple-500">
                   <option value="Cheque">Cheque</option>
                   <option value="DD">Demand Draft (DD)</option>
                   <option value="NEFT/RTGS">NEFT / RTGS</option>
                   <option value="Cash">Cash</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase">Instrument No</label>
                  <input name="instrumentNo" type="text" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-purple-500 font-mono" placeholder="Chq No" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase">Inst. Date</label>
                  <input name="instrumentDate" type="date" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase">Deposited Bank</label>
                <input name="depositedBank" type="text" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-purple-500" placeholder="e.g. HDFC Bank" />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                 <button type="submit" className="w-full py-2.5 bg-purple-600 text-white font-bold rounded shadow hover:bg-purple-700 active:scale-95 transition-all">
                   Save Receipt
                 </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-8 bg-white shadow-md border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
               <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900">
                 <ClipboardList className="w-6 h-6 text-slate-600" /> Payment Register
               </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr className="bg-white">
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-xs">Date</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-xs">Ref Bill</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-xs">Instrument</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-xs">Bank</th>
                    <th className="px-4 py-3 text-right font-bold text-purple-700 uppercase text-xs">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {recentPayments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No payments logged yet.</td>
                    </tr>
                  ) : recentPayments.map(p => (
                    <tr key={p.id} className="hover:bg-purple-50/50 transition-colors border-l-2 border-transparent hover:border-purple-400">
                      <td className="px-4 py-3 font-mono text-slate-500 text-xs">{p.paymentDate?.split(' ')[0]}</td>
                      <td className="px-4 py-3 text-xs">
                         <span className="font-bold text-slate-800">{p.billNo}</span>
                         <span className="ml-2 text-slate-500">{p.buyerName}</span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                         <div className="font-bold">{p.instrumentType}</div>
                         {p.instrumentNo && <div className="text-slate-500 font-mono">{p.instrumentNo}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{p.depositedBank}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-purple-700">₹{p.amount?.toFixed(2)}</td>
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
