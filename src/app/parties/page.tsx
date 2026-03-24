import { db } from '@/db';
import { parties } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { createParty } from '../actions/party';
import { Building2, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PartiesPage() {
  let recentParties: any[] = [];
  
  try {
    recentParties = await db.select().from(parties).orderBy(desc(parties.id)).limit(50);
  } catch (err) {
    console.error("DB error:", err);
  }

  return (
    <main className="p-4 font-sans text-sm text-slate-800">
      <div className="max-w-screen-2xl mx-auto space-y-4">
        <header className="bg-indigo-900 border-b border-indigo-800 p-4 rounded-xl shadow flex justify-between items-center text-white">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Party Directory</h1>
            <p className="text-indigo-200 text-xs">Manage Companies, Clients, and Brokers</p>
          </div>
        </header>

        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white shadow-md border border-slate-200 rounded-xl overflow-hidden flex flex-col h-fit">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
               <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900">
                 <Building2 className="w-6 h-6 text-indigo-600" /> Register Company
               </h2>
            </div>
            <form action={createParty} className="p-6 space-y-5 flex-1 bg-white">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase">Company Name *</label>
                <input required name="name" type="text" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. ABC Trading Co" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase">GSTIN</label>
                  <input name="gstin" type="text" className="mt-1 w-full rounded border-slate-300 p-2 text-xs bg-white border outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase">TIN</label>
                  <input name="tin" type="text" className="mt-1 w-full rounded border-slate-300 p-2 text-xs bg-white border outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase">Phone</label>
                  <input name="phone" type="text" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase">Default Broker</label>
                  <input name="broker" type="text" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <label className="block text-xs font-bold text-slate-600 uppercase">Address & Notes</label>
                <textarea name="address" rows={2} className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                 <button type="submit" className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded shadow hover:bg-indigo-700 active:scale-95 transition-all">
                   Save Party
                 </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-8 bg-white shadow-md border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
               <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900">
                 <Users className="w-6 h-6 text-slate-600" /> Registered Parties
               </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-xs">Name</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-xs">GSTIN</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-xs">Phone</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-xs">Broker</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {recentParties.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400">No parties registered yet.</td>
                    </tr>
                  ) : recentParties.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-800">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-xs">{p.gstin || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{p.phone || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{p.broker || '-'}</td>
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
