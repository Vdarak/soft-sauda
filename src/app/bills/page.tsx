import { db } from '@/db';
import { contracts, deliveries, bills } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { createBill } from '../actions/bill';
import { Receipt, ClipboardList } from 'lucide-react';

export default async function BillsPage() {
  let recentBills: any[] = [];
  let availableContracts: any[] = [];
  let availableDeliveries: any[] = [];
  
  try {
    recentBills = await db.select({
      id: bills.id,
      billNo: bills.billNo,
      billDate: bills.billDate,
      billAmount: bills.billAmount,
      balanceAmount: bills.balanceAmount,
      saudaNo: contracts.saudaNo,
      buyerName: contracts.buyerName,
    }).from(bills)
      .leftJoin(contracts, eq(bills.contractId, contracts.id))
      .orderBy(desc(bills.id))
      .limit(15);
      
    availableContracts = await db.select().from(contracts).orderBy(desc(contracts.id)).limit(100);
    availableDeliveries = await db.select().from(deliveries).orderBy(desc(deliveries.id)).limit(100);
  } catch (err) {
    console.error("DB error:", err);
  }

  return (
    <main className="p-4 font-sans text-sm text-slate-800">
      <div className="max-w-screen-2xl mx-auto space-y-4">
        <header className="bg-amber-800 border-b border-amber-700 p-4 rounded-xl shadow flex justify-between items-center text-white">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Billing & Outstandings</h1>
            <p className="text-amber-200 text-xs">Generate invoices and track receivables</p>
          </div>
        </header>

        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white shadow-md border border-slate-200 rounded-xl overflow-hidden flex flex-col h-fit">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
               <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900">
                 <Receipt className="w-6 h-6 text-amber-600" /> Raise Invoice
               </h2>
            </div>
            <form action={createBill} className="p-6 space-y-5 flex-1 bg-white">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase">Attach to Contract *</label>
                <select required name="contractId" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-amber-500">
                   <option value="">-- Select Contract --</option>
                   {availableContracts.map(c => (
                      <option key={c.id} value={c.id}>
                         #{c.saudaNo} | {c.buyerName}
                      </option>
                   ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase">Attach to Delivery (Optional)</label>
                <select name="deliveryId" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-amber-500">
                   <option value="">-- Direct Bill (No Delivery) --</option>
                   {availableDeliveries.map(d => (
                      <option key={d.id} value={d.id}>
                         Truck: {d.truckNo} ({d.dispatchDate?.split(' ')[0]})
                      </option>
                   ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase">Bill No *</label>
                  <input required name="billNo" type="text" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-amber-500 font-mono" placeholder="INV-001" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase">Bill Date</label>
                  <input name="billDate" type="date" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase">Gross Amount</label>
                  <input required name="billAmount" type="number" step="0.01" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-amber-500 font-mono" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase">- Deductions</label>
                  <input name="deductions" type="number" step="0.01" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-amber-500 font-mono" placeholder="0.00" />
                </div>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <label className="block text-xs font-bold text-slate-600 uppercase">Credit Days Allowed</label>
                <input name="creditDays" type="number" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-amber-500" placeholder="30" />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                 <button type="submit" className="w-full py-2.5 bg-amber-600 text-white font-bold rounded shadow hover:bg-amber-700 active:scale-95 transition-all">
                   Save Invoice
                 </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-8 bg-white shadow-md border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
               <h2 className="text-lg font-bold flex items-center gap-2">
                 <ClipboardList className="w-6 h-6 text-slate-600" /> Outstanding Register
               </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr className="bg-white">
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-xs">Bill No</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-xs">Date</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-xs">Ref Contract</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-600 uppercase text-xs">Gross</th>
                    <th className="px-4 py-3 text-right font-bold text-amber-700 uppercase text-xs">Pending Bal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {recentBills.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No bills generated yet.</td>
                    </tr>
                  ) : recentBills.map(b => (
                    <tr key={b.id} className="hover:bg-amber-50/50 transition-colors border-l-2 border-transparent hover:border-amber-400">
                      <td className="px-4 py-3 font-bold text-slate-800">{b.billNo}</td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-xs">{b.billDate?.split(' ')[0]}</td>
                      <td className="px-4 py-3 text-xs">
                         <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono">#{b.saudaNo}</span>
                         <span className="ml-2 font-medium">{b.buyerName}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600 font-medium">₹{b.billAmount?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-amber-700">₹{b.balanceAmount?.toFixed(2)}</td>
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
