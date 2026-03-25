import { db } from '@/db';
import { parties } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { Building2, Users, Plus, Search, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PartiesPage() {
  let recentParties: any[] = [];
  
  try {
    recentParties = await db.select().from(parties).orderBy(desc(parties.id)).limit(50);
  } catch (err) {
    console.error("DB error:", err);
  }

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-sm text-slate-800">
      <div className="max-w-screen-2xl mx-auto p-4 space-y-6 flex flex-col h-screen">
        
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-5 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Party Directory</h1>
              <p className="text-slate-500 text-sm">Manage Companies, Clients, and Brokers</p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search parties..." 
                className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-lg outline-none transition-all"
              />
            </div>
            <Link 
              href="/parties/new"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2 rounded-lg shadow-sm shadow-indigo-200 transition-all active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> New Party
            </Link>
          </div>
        </header>

        {/* Grid View */}
        <div className="flex-1 bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 p-4">
             <h2 className="text-sm font-bold flex items-center gap-2 text-slate-900 uppercase tracking-wider">
               <Users className="w-4 h-4 text-slate-500" /> Registered Parties ({recentParties.length})
             </h2>
          </div>
          <div className="overflow-x-auto flex-1 h-full">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-white sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-xs tracking-wider">Party Name</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-xs tracking-wider">Location</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-xs tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase text-xs tracking-wider">Credit Limit</th>
                  <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase text-xs tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {recentParties.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                       <Building2 className="w-12 h-12 text-slate-200" />
                       <p>No parties registered yet in the new system.</p>
                       <Link href="/parties/new" className="text-indigo-600 font-semibold hover:underline mt-2">Add your first party</Link>
                    </td>
                  </tr>
                ) : recentParties.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      {p.designation && <div className="text-xs text-slate-500 mt-0.5">{p.designation}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        {p.place ? <><MapPin className="w-3.5 h-3.5 text-slate-400" /> {p.place}</> : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        {p.phone ? <><Phone className="w-3.5 h-3.5 text-slate-400" /> {p.phone}</> : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-slate-600">
                      {p.creditLimit ? `₹ ${Number(p.creditLimit).toLocaleString()}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {p.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">Active</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600">Inactive</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                       <Link href={`/parties/${p.id}`} className="text-indigo-600 font-bold hover:underline text-xs bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">Edit</Link>
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
