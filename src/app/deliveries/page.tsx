import { db } from '@/db';
import { deliveries, deliveryLines, contracts, contractLines, contractParties, parties, commodities } from '@/db/schema';
import { desc, eq, inArray } from 'drizzle-orm';
import { Box, Plus, Search, Truck, ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DeliveriesPage() {
  let enrichedDeliveries: any[] = [];
  
  try {
    const rawDeliveries = await db.select().from(deliveries).orderBy(desc(deliveries.id)).limit(50);
    
    // Enrich with relations gracefully
    for (const d of rawDeliveries) {
      let transporterName = 'N/A';
      if (d.transporterId) {
        const transQuery = await db.select({ name: parties.name }).from(parties).where(eq(parties.id, d.transporterId)).limit(1);
        if (transQuery.length > 0) transporterName = transQuery[0].name;
      }
      
      const lines = await db.select().from(deliveryLines).where(eq(deliveryLines.deliveryId, d.id)).limit(1);
      
      let contractDetails = null;
      if (lines.length > 0) {
        const dLine = lines[0];
        
        // Fetch Contract details linked to this Delivery Line
        const cLineGroup = await db.select({
          saudaNo: contracts.saudaNo,
          saudaBook: contracts.saudaBook,
          contractId: contracts.id,
          commodityId: contractLines.commodityId
        })
        .from(contractLines)
        .innerJoin(contracts, eq(contractLines.contractId, contracts.id))
        .where(eq(contractLines.id, dLine.contractLineId)).limit(1);

        if (cLineGroup.length > 0) {
           const cg = cLineGroup[0];
           
           // Fetch Commodity Name
           const comm = await db.select({ name: commodities.name }).from(commodities).where(eq(commodities.id, cg.commodityId!)).limit(1);
           
           // Fetch Parties
           const cpRows = await db.select({ role: contractParties.role, name: parties.name })
            .from(contractParties)
            .innerJoin(parties, eq(contractParties.partyId, parties.id))
            .where(eq(contractParties.contractId, cg.contractId));

           contractDetails = {
             saudaNo: cg.saudaNo,
             saudaBook: cg.saudaBook,
             commodityName: comm[0]?.name || 'UNKNOWN',
             sellerName: cpRows.find(p => p.role === 'SELLER')?.name || 'UNKNOWN',
             buyerName: cpRows.find(p => p.role === 'BUYER')?.name || 'UNKNOWN',
             weight: dLine.dispatchedWeight,
             bags: dLine.dispatchedBags
           };
        }
      }

      enrichedDeliveries.push({
        ...d,
        transporterName,
        contractDetails,
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
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dispatch Logistics</h1>
              <p className="text-slate-500 text-sm">Monitor deliveries and lorry receipts mapped to Saudhas</p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search deliveries..." 
                className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-lg outline-none transition-all"
              />
            </div>
            <Link 
              href="/deliveries/new"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2 rounded-lg shadow-sm transition-all active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Log Delivery
            </Link>
          </div>
        </header>

        {/* Grid View */}
        <div className="flex-1 bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 p-4">
             <h2 className="text-sm font-bold flex items-center gap-2 text-slate-900 uppercase tracking-wider">
               <Truck className="w-4 h-4 text-slate-500" /> Recent Dispatches ({enrichedDeliveries.length})
             </h2>
          </div>
          <div className="overflow-x-auto flex-1 h-full">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-white sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-xs tracking-wider">Logistics Info</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-xs tracking-wider">Linked Sauda</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-xs tracking-wider">Commodity & Yield</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-xs tracking-wider">Path</th>
                  <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase text-xs tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase text-xs tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {enrichedDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                       <Truck className="w-12 h-12 text-slate-200" />
                       <p>No dispatches recorded.</p>
                       <Link href="/deliveries/new" className="text-emerald-600 font-semibold hover:underline mt-2">Log a new delivery</Link>
                    </td>
                  </tr>
                ) : enrichedDeliveries.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 font-mono text-[13px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block mb-1">
                         {d.truckNo || 'NO-TRUCK'}
                      </div>
                      <div className="text-xs text-slate-600 font-bold">{d.transporterName}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">RR Date: {d.dispatchDate?.toISOString().split('T')[0]}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {d.contractDetails ? (
                         <div>
                            <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-xs font-bold inline-block mb-1">
                              Sauda #{d.contractDetails.saudaNo}
                            </span>
                            <div className="text-[11px] text-slate-500">{d.contractDetails.saudaBook}</div>
                         </div>
                      ) : <span className="text-slate-400 italic text-xs">Unlinked</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {d.contractDetails ? (
                         <div>
                            <div className="font-bold text-slate-800">{d.contractDetails.commodityName}</div>
                            <div className="text-xs text-emerald-700 font-bold font-mono mt-1">
                               {d.contractDetails.weight} Qtls {d.contractDetails.bags && `(${d.contractDetails.bags} bags)`}
                            </div>
                         </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {d.contractDetails ? (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-600 font-semibold truncate w-24" title={d.contractDetails.sellerName}>{d.contractDetails.sellerName}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="text-emerald-700 font-bold truncate w-24" title={d.contractDetails.buyerName}>{d.contractDetails.buyerName}</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {d.status === 'DISPATCHED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                           <Truck className="w-3 h-3" /> Dispatched
                        </span>
                      ) : d.status === 'DELIVERED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                           <CheckCircle2 className="w-3 h-3" /> Delivered
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">{d.status}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link href={`/deliveries/${d.id}`} className="text-emerald-700 font-bold hover:underline text-xs bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">Edit</Link>
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
