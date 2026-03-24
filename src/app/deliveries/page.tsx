import { db } from '@/db';
import { contracts, deliveries } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { createDelivery } from '../actions/delivery';
import { Truck, ClipboardList } from 'lucide-react';

export default async function DeliveriesPage() {
  let recentDeliveries: any[] = [];
  let availableContracts: any[] = [];
  
  try {
    recentDeliveries = await db.select({
      id: deliveries.id,
      dispatchDate: deliveries.dispatchDate,
      truckNo: deliveries.truckNo,
      weight: deliveries.weight,
      quantity: deliveries.quantity,
      saudaNo: contracts.saudaNo,
      sellerName: contracts.sellerName,
      buyerName: contracts.buyerName,
    }).from(deliveries)
      .leftJoin(contracts, eq(deliveries.contractId, contracts.id))
      .orderBy(desc(deliveries.id))
      .limit(15);
      
    availableContracts = await db.select().from(contracts).orderBy(desc(contracts.id)).limit(100);
  } catch (err) {
    console.error("DB error:", err);
  }

  return (
    <main className="p-4 font-sans text-sm text-slate-800">
      <div className="max-w-screen-2xl mx-auto space-y-4">
        <header className="bg-emerald-800 border-b border-emerald-700 p-4 rounded-xl shadow flex justify-between items-center text-white">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Deliveries & Dispatch</h1>
            <p className="text-emerald-200 text-xs">Manage logistics and outgoing vehicles</p>
          </div>
        </header>

        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white shadow-md border border-slate-200 rounded-xl overflow-hidden flex flex-col h-fit">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
               <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900">
                 <Truck className="w-6 h-6 text-emerald-600" /> Log New Delivery
               </h2>
            </div>
            <form action={createDelivery} className="p-6 space-y-5 flex-1 bg-white">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase">Attach to Contract (Sauda) *</label>
                <select required name="contractId" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-emerald-500">
                   <option value="">-- Select Active Contract --</option>
                   {availableContracts.map(c => (
                      <option key={c.id} value={c.id}>
                         #{c.saudaNo} | {c.buyerName} ({c.commodity})
                      </option>
                   ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase">Dispatch Date</label>
                <input name="dispatchDate" type="date" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase">Truck No *</label>
                <input required name="truckNo" type="text" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. MH 04 AB 1234" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase">Weight loaded</label>
                  <input required name="weight" type="number" step="0.01" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-emerald-500 font-mono" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase">Quantity/Bags</label>
                  <input name="quantity" type="number" step="0.01" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-emerald-500 font-mono" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase">Freight Advance (₹)</label>
                <input name="freightAdvance" type="number" step="0.01" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-emerald-500 font-mono" placeholder="0.00" />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                 <button type="submit" className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded shadow hover:bg-emerald-700 active:scale-95 transition-all">
                   Save Delivery Entry
                 </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-8 bg-white shadow-md border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
               <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900">
                 <ClipboardList className="w-6 h-6 text-slate-600" /> Dispatch Register
               </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr className="bg-white">
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-xs">Date</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-xs">Truck</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-xs">Contract</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-xs">Parties</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-600 uppercase text-xs">Loaded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {recentDeliveries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No deliveries logged yet.</td>
                    </tr>
                  ) : recentDeliveries.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-slate-600">{d.dispatchDate?.split(' ')[0]}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{d.truckNo}</td>
                      <td className="px-4 py-3"><span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono text-xs">#{d.saudaNo}</span></td>
                      <td className="px-4 py-3 text-xs">
                         <div className="font-bold">{d.buyerName}</div>
                         <div className="text-slate-500">fm: {d.sellerName}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                         <div className="font-bold text-emerald-700">{d.weight}</div>
                         {d.quantity && <div className="text-xs text-slate-500">{d.quantity} unit</div>}
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
