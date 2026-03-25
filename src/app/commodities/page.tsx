import { db } from '@/db';
import { commodities } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { Box, Plus, Search } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CommoditiesPage() {
  let commodityList: any[] = [];
  
  try {
    commodityList = await db.select().from(commodities).orderBy(desc(commodities.id)).limit(100);
  } catch (err) {
    console.error("DB error:", err);
  }

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-sm text-slate-800">
      <div className="max-w-screen-xl mx-auto p-4 space-y-6 flex flex-col h-screen">
        
        <header className="bg-white border-b border-slate-200 px-6 py-5 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Commodity Master</h1>
              <p className="text-slate-500 text-sm">Manage products, brands, and HSN codes</p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search commodities..." 
                className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-lg outline-none transition-all"
              />
            </div>
            <Link 
              href="/commodities/new"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2 rounded-lg shadow-sm transition-all active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Add Commodity
            </Link>
          </div>
        </header>

        <div className="flex-1 bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1 h-full">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-white sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-xs tracking-wider">Commodity Name</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-xs tracking-wider">Short Code</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-xs tracking-wider">HSN / Tax Code</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {commodityList.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                       <Box className="w-12 h-12 text-slate-200" />
                       <p>No commodities found.</p>
                       <Link href="/commodities/new" className="text-indigo-600 font-semibold hover:underline mt-2">Add your first commodity</Link>
                    </td>
                  </tr>
                ) : commodityList.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{c.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-slate-600 font-mono text-xs">{c.shortName || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-slate-600 font-mono text-xs">{c.hsnCode || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                       <Link href={`/commodities/${c.id}`} className="text-indigo-600 font-bold hover:underline text-xs bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">Edit</Link>
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
