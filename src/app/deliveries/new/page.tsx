import { db } from '@/db';
import { contracts, contractLines, commodities, parties } from '@/db/schema';
import { createDelivery } from '@/app/actions/delivery';
import { Box, ArrowLeft, Truck } from 'lucide-react';
import { eq, desc } from 'drizzle-orm';
import VanillaInteractions from '@/components/VanillaInteractions';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function NewDeliveryPage() {
  let openLines: any[] = [];
  let availableParties: any[] = [];
  
  try {
    // Fetch all active contract lines ready for dispatch
    openLines = await db.select({
      id: contracts.id,
      saudaNo: contracts.saudaNo,
      saudaBook: contracts.saudaBook,
      lineId: contractLines.id,
      commodityName: commodities.name,
      totalWeight: contractLines.weightQuintals,
      rate: contractLines.rate,
    })
    .from(contracts)
    .innerJoin(contractLines, eq(contracts.id, contractLines.contractId))
    .innerJoin(commodities, eq(contractLines.commodityId, commodities.id))
    .where(eq(contracts.status, 'ACTIVE'))
    .orderBy(desc(contracts.saudaNo))
    .limit(200);

    availableParties = await db.select().from(parties).limit(500);
  } catch (err) {
    console.error("DB error fetching logistics data:", err);
  }

  const INTERACTION_SCRIPT = `
    if (typeof document !== 'undefined') {
      const parties = ${JSON.stringify(availableParties)};
      const input = document.querySelector('input[name="transporterName"]');
      const dropdown = document.getElementById('transporterDropdown');

      if (input && dropdown) {
        document.addEventListener('click', (e) => {
            if (e.target !== input && !dropdown.contains(e.target)) {
              dropdown.classList.add('hidden');
            }
        });

        input.addEventListener('focus', () => input.dispatchEvent(new Event('input')));

        input.addEventListener('input', function(e) {
            const val = e.target.value.toLowerCase();
            if (!val) {
              dropdown.classList.add('hidden');
              return;
            }
            
            const matches = parties.filter(p => (p.name || '').toLowerCase().includes(val)).slice(0, 10);
            if (matches.length === 0) {
              dropdown.classList.add('hidden');
              return;
            }
            
            dropdown.innerHTML = matches.map(p => 
              \`<div class="px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 text-slate-700 font-medium border-b border-slate-100 last:border-0" data-name="\${p.name.replace(/"/g, '&quot;')}">
                \${p.name}
              </div>\`
            ).join('');
            dropdown.classList.remove('hidden');
            
            dropdown.querySelectorAll('div').forEach(item => {
              item.addEventListener('click', function() {
                  input.value = this.getAttribute('data-name');
                  dropdown.classList.add('hidden');
              });
            });
        });
      }
    }
  `;

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-sm text-slate-800 pb-20">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Link href="/deliveries" className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">New Dispatch (Delivery)</h1>
              <p className="text-slate-500 text-sm">Register weighbridge logistics against an active Sauda</p>
            </div>
          </div>
        </header>

        {/* Dispatch Entry Form */}
        <div className="bg-white shadow-md border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 p-4">
             <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900">
               <Truck className="w-5 h-5 text-emerald-600" /> Dispatch Details
             </h2>
          </div>
          
          <form action={createDelivery} className="p-6 space-y-8 flex-1 bg-white relative">
            
            {/* Context: Parent Contract */}
            <fieldset className="border border-slate-200 rounded-md p-4 bg-slate-50/50">
              <legend className="px-2 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white rounded border border-slate-200 ml-2">Link To Contract</legend>
              <div className="pt-2">
                 <label className="block text-xs font-bold text-slate-600">Select Active Sauda Line *</label>
                 <select required name="contractLineId" className="mt-1 w-full rounded border-slate-300 p-2.5 text-sm bg-white border focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 outline-none">
                    <option value="">-- Search & Select Sauda --</option>
                    {openLines.map(line => (
                      <option key={line.lineId} value={line.lineId}>
                        Sauda #{line.saudaNo} ({line.saudaBook}) - {line.commodityName} - {line.totalWeight} Qtls @ ₹{line.rate}
                      </option>
                    ))}
                 </select>
                 <p className="text-xs text-slate-500 mt-2">Only Saudhas marked as 'ACTIVE' appear here.</p>
              </div>
            </fieldset>

            {/* Row: Logistics */}
            <div className="grid grid-cols-2 gap-6">
               <fieldset className="border border-slate-200 rounded-md p-4 bg-slate-50/50 relative focus-within:border-emerald-300 focus-within:ring-1 focus-within:ring-emerald-300 transition-all">
                  <legend className="px-2 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white rounded border border-slate-200 ml-2">Transporter Info</legend>
                  <div className="space-y-4 pt-2">
                     <div className="relative">
                       <label className="block text-xs font-bold text-slate-600">Transport Agency Name</label>
                       <input name="transporterName" type="text" autoComplete="off" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-emerald-500 transition-colors" placeholder="e.g. VRL Logistics" />
                       <div id="transporterDropdown" className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl hidden max-h-48 overflow-y-auto"></div>
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-slate-600">Truck / Lorry No. *</label>
                       <input required name="truckNo" type="text" className="mt-1 w-full rounded border-slate-300 p-2 text-sm uppercase bg-white border outline-none font-mono focus:ring-2 focus:ring-emerald-500" placeholder="MH-12-AB-1234" />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-slate-600">Dispatch / RR Date *</label>
                       <input required name="dispatchDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-emerald-500" />
                     </div>
                  </div>
               </fieldset>

               <fieldset className="border border-slate-200 rounded-md p-4 bg-slate-50/50 relative focus-within:border-emerald-300 focus-within:ring-1 focus-within:ring-emerald-300 transition-all">
                  <legend className="px-2 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white rounded border border-slate-200 ml-2">Weighbridge Yield</legend>
                  <div className="space-y-4 pt-2">
                     <div>
                       <label className="block text-xs font-bold text-slate-600">Dispatched Bags / Packets</label>
                       <input name="dispatchedBags" type="number" step="0.01" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-slate-600">Dispatched Weight (Quintals) *</label>
                       <input required name="dispatchedWeight" type="number" step="0.001" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500 font-mono" placeholder="0.000" />
                     </div>
                  </div>
               </fieldset>
            </div>

            <div className="pt-4 flex justify-end gap-4 border-t border-slate-100">
               <Link href="/deliveries" className="px-6 py-2 border border-slate-300 text-slate-600 font-bold rounded hover:bg-slate-50 transition">Cancel</Link>
               <button type="submit" className="px-8 py-2 bg-emerald-600 text-white font-bold rounded shadow hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-300 active:scale-95 transition-all">
                 Record Dispatch
               </button>
            </div>

            <VanillaInteractions id="deliveries-js-engine" html={INTERACTION_SCRIPT} />
          </form>
        </div>
      </div>
    </main>
  );
}
