import { db } from '@/db';
import { contracts, contractParties, contractLines, parties, commodities } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { Archive, Plus, Search, Package, Printer, Pencil } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ContractsPage() {
  let enrichedContracts: any[] = [];
  
  try {
    const rawContracts = await db.select().from(contracts).orderBy(desc(contracts.saudaNo)).limit(50);
    
    // Enrich with relations gracefully without relying on drizzle 'relations' schema definitions
    for (const c of rawContracts) {
      const partiesRows = await db.select({ role: contractParties.role, name: parties.name })
        .from(contractParties)
        .leftJoin(parties, eq(contractParties.partyId, parties.id))
        .where(eq(contractParties.contractId, c.id));
        
      const lineRows = await db.select({ commodityId: contractLines.commodityId, amount: contractLines.amount, weight: contractLines.weightQuintals })
        .from(contractLines)
        .where(eq(contractLines.contractId, c.id)).limit(1);
        
      const commQuery = lineRows[0]?.commodityId ? await db.select({ name: commodities.name })
        .from(commodities).where(eq(commodities.id, lineRows[0].commodityId)).limit(1) : [];

      enrichedContracts.push({
        ...c,
        sellerName: partiesRows.find(p => p.role === 'SELLER')?.name || 'UNKNOWN',
        buyerName: partiesRows.find(p => p.role === 'BUYER')?.name || 'UNKNOWN',
        amount: lineRows[0]?.amount || 0,
        weight: lineRows[0]?.weight || 0,
        commodityName: commQuery[0]?.name || 'UNKNOWN',
      });
    }
  } catch (err) {
    console.error("DB error:", err);
  }

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-sm text-slate-800">
      <div className="max-w-screen-2xl mx-auto p-4 space-y-6 flex flex-col h-screen">
        
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-5 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sauda Register (Contracts)</h1>
              <p className="text-slate-500 text-sm">View and manage trade executions</p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search contracts..." 
                className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg outline-none transition-all"
              />
            </div>
            <Link 
              href="/contracts/new"
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold flex items-center gap-2 rounded-lg shadow-sm transition-all active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> New Sauda
            </Link>
          </div>
        </header>

        {/* Grid View */}
        <div className="flex-1 bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 p-4">
             <h2 className="text-sm font-bold flex items-center gap-2 text-slate-900 uppercase tracking-wider">
               <Archive className="w-4 h-4 text-slate-500" /> Recent Contracts ({enrichedContracts.length})
             </h2>
          </div>
          <div className="overflow-x-auto flex-1 h-full">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-white sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-xs tracking-wider">Sauda Details</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-xs tracking-wider">Trade Parties</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-xs tracking-wider">Commodity</th>
                  <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase text-xs tracking-wider">Trade Value</th>
                  <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase text-xs tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {enrichedContracts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                       <Archive className="w-12 h-12 text-slate-200" />
                       <p>No trade contracts logged yet.</p>
                       <Link href="/contracts/new" className="text-blue-600 font-semibold hover:underline mt-2">Draft your first contract</Link>
                    </td>
                  </tr>
                ) : enrichedContracts.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                         <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">#{c.saudaNo}</span>
                         {c.saudaBook}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">Date: {c.saudaDate?.toISOString().split('T')[0]}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center gap-1.5"><strong className="text-slate-400 w-12">SELLER</strong> <span className="text-slate-800 font-semibold">{c.sellerName}</span></div>
                        <div className="flex items-center gap-1.5"><strong className="text-slate-400 w-12">BUYER</strong> <span className="text-emerald-700 font-semibold">{c.buyerName}</span></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                        <Package className="w-4 h-4 text-slate-400" /> {c.commodityName}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 ml-5">{c.weight} Qtls</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="font-mono font-bold text-slate-700">₹ {Number(c.amount).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {c.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">Active</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600">{c.status}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                       <div className="inline-flex items-center gap-2">
                       <Link href={`/contracts/${c.id}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors">
                         <Pencil className="w-3.5 h-3.5" /> Edit
                       </Link>
                       <a href={`/api/pdf/contract/${c.saudaNo}`} target="_blank" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                         <Printer className="w-3.5 h-3.5" /> PDF
                       </a>
                       </div>
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
