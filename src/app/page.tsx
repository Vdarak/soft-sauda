import { db } from '@/db';
import { contracts, parties } from '@/db/schema';
import { createContract } from './actions/contract';
import { desc } from 'drizzle-orm';
import { PenLine, Archive, Printer } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let recentContracts: any[] = [];
  let availableParties: any[] = [];
  let dbError = false;
  
  try {
    recentContracts = await db.select().from(contracts).orderBy(desc(contracts.saudaNo)).limit(15);
    availableParties = await db.select().from(parties).limit(500);
  } catch (err) {
    console.error("DB connection error:", err);
    dbError = true;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 font-sans text-sm text-slate-800">
      {dbError && (
        <div className="max-w-7xl mx-auto mb-4 p-4 bg-red-100 border border-red-300 rounded-lg text-red-800">
          <h3 className="font-bold text-lg">Database Connection Failed</h3>
          <p className="mt-1">Please ensure SQLite/PostgreSQL is running and configured correctly.</p>
        </div>
      )}

      <div className="max-w-screen-2xl mx-auto space-y-4">
        {/* Header Ribbon */}
        <header className="bg-blue-900 border-b border-blue-800 p-4 rounded-xl shadow flex justify-between items-center text-white">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Soft Sauda</h1>
            <p className="text-blue-200 text-xs">Enterprise Trading & Logistics ERP</p>
          </div>
          <div className="flex gap-4">
             <div className="px-3 py-1 bg-blue-800 rounded-md text-xs font-mono font-medium border border-blue-700">Financial Year: 2026-27</div>
             <div className="px-3 py-1 bg-emerald-600 rounded-md text-xs font-bold shadow-inner">SYSTEM ONLINE</div>
          </div>
        </header>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Main Data Entry Form */}
          <div className="lg:col-span-8 bg-white shadow-md border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
               <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900">
                 <PenLine className="w-6 h-6 text-blue-600" /> Draft New Trade Contract (Sauda)
               </h2>
            </div>
            
            <form action={createContract} className="p-6 space-y-6 flex-1 bg-white">
              <datalist id="partyNamesList">
                {availableParties.map(p => <option key={p.id} value={p.name} />)}
              </datalist>

              {/* Row 1: Identifiers */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase">Sauda No *</label>
                  <input required name="saudaNo" type="number" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border focus:ring-2 focus:ring-blue-500 outline-none" placeholder="1042" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase">Sauda Date</label>
                  <input name="saudaDate" type="date" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase">Sauda Book</label>
                  <input name="saudaBook" type="text" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Main Book" />
                </div>
              </div>

              {/* Row 2: Parties */}
              <div className="grid grid-cols-2 gap-6">
                {/* Seller Group */}
                <fieldset className="border border-slate-200 rounded-md p-4 bg-slate-50/50 relative">
                  <legend className="px-2 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white rounded border border-slate-200 ml-2">Seller Details</legend>
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-600">Company Name *</label>
                        <input required list="partyNamesList" name="sellerName" type="text" autoComplete="off" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-blue-500 transition-colors" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600">Broker</label>
                        <input name="sellerBroker" type="text" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">GSTIN</label>
                        <input name="sellerGstin" type="text" className="mt-1 w-full rounded border-slate-300 p-1.5 text-xs bg-white border outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Legacy TIN</label>
                        <input name="sellerTin" type="text" className="mt-1 w-full rounded border-slate-300 p-1.5 text-xs bg-white border outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Legacy CST</label>
                        <input name="sellerCst" type="text" className="mt-1 w-full rounded border-slate-300 p-1.5 text-xs bg-white border outline-none" />
                      </div>
                    </div>
                  </div>
                </fieldset>

                {/* Buyer Group */}
                <fieldset className="border border-slate-200 rounded-md p-4 bg-slate-50/50 relative">
                  <legend className="px-2 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white rounded border border-slate-200 ml-2">Buyer Details</legend>
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-600">Company Name *</label>
                        <input required list="partyNamesList" name="buyerName" type="text" autoComplete="off" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-emerald-500 transition-colors" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600">Broker</label>
                        <input name="buyerBroker" type="text" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-emerald-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">GSTIN</label>
                        <input name="buyerGstin" type="text" className="mt-1 w-full rounded border-slate-300 p-1.5 text-xs bg-white border outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Legacy TIN</label>
                        <input name="buyerTin" type="text" className="mt-1 w-full rounded border-slate-300 p-1.5 text-xs bg-white border outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Legacy CST</label>
                        <input name="buyerCst" type="text" className="mt-1 w-full rounded border-slate-300 p-1.5 text-xs bg-white border outline-none" />
                      </div>
                    </div>
                  </div>
                </fieldset>
              </div>

              {/* Row 3: Trade & Pricing */}
              <fieldset className="border border-slate-200 rounded-md p-4 bg-slate-50/50 mt-4 relative">
                <legend className="px-2 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white rounded border border-slate-200 ml-2">Trade Execution</legend>
                <div className="grid-cols-6 grid gap-4 pt-2">
                   <div className="col-span-2">
                     <label className="block text-xs font-bold text-slate-600">Commodity *</label>
                     <input required name="commodity" type="text" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500" />
                   </div>
                   <div className="col-span-2">
                     <label className="block text-xs font-bold text-slate-600">Brand/Grade</label>
                     <input name="brand" type="text" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500" />
                   </div>
                   <div className="col-span-2">
                     <label className="block text-xs font-bold text-slate-600">Packaging</label>
                     <input name="packaging" type="text" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. 50kg Gunny" />
                   </div>
                   
                   <div className="col-span-2">
                     <label className="block text-xs font-bold text-slate-600">Total Qty (Weight)</label>
                     <input name="weight" type="number" step="0.01" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
                   </div>
                   <div className="col-span-2">
                     <label className="block text-xs font-bold text-slate-600">Agreed Rate (₹)</label>
                     <input name="rate" type="number" step="0.01" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
                   </div>
                   <div className="col-span-2">
                     <label className="block text-xs font-bold text-slate-400">Total Amount</label>
                     <input readOnly id="calcAmount" className="mt-1 w-full rounded border border-dashed border-slate-300 p-2 text-sm bg-slate-100 text-slate-600 font-mono italic outline-none" placeholder="Auto-calculated" />
                   </div>
                </div>
                
                {/* Extremely performant inline vanilla JS for UI updates without React state */}
                <script dangerouslySetInnerHTML={{ __html: `
                  if (typeof document !== 'undefined') {
                    const partiesDict = ${JSON.stringify(availableParties.reduce((a, p) => { a[p.name] = p; return a; }, {}))};
                    
                    document.addEventListener('input', function(e) {
                      const form = e.target.closest('form');
                      if (!form) return;

                      // Auto-calculate Amount
                      if (e.target.name === 'weight' || e.target.name === 'rate') {
                         const weight = parseFloat(form.weight.value) || 0;
                         const rate = parseFloat(form.rate.value) || 0;
                         const display = form.querySelector('#calcAmount');
                         if (display && weight > 0 && rate > 0) {
                           display.value = '₹ ' + (weight * rate).toFixed(2);
                         } else if (display) {
                           display.value = '';
                         }
                      }
                      
                      // Auto-complete Party Data
                      if (e.target.name === 'sellerName' || e.target.name === 'buyerName') {
                         const prefix = e.target.name === 'sellerName' ? 'seller' : 'buyer';
                         const party = partiesDict[e.target.value];
                         if (party) {
                            if(form[prefix + 'Broker']) form[prefix + 'Broker'].value = party.broker || '';
                            if(form[prefix + 'Gstin']) form[prefix + 'Gstin'].value = party.gstin || '';
                            if(form[prefix + 'Tin']) form[prefix + 'Tin'].value = party.tin || '';
                            if(form[prefix + 'Cst']) form[prefix + 'Cst'].value = party.cst || '';
                            e.target.style.borderWidth = '2px';
                            e.target.style.borderColor = '#10b981'; // highlight green match
                         } else {
                            e.target.style.borderWidth = '';
                            e.target.style.borderColor = '';
                         }
                      }
                    });
                  }
                `}} />
              </fieldset>

               {/* Row 4: Terms */}
              <div className="grid grid-cols-4 gap-4 bg-slate-100 p-4 rounded-lg border border-slate-200">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600">Delivery Term</label>
                  <input name="deliveryTerm" type="text" className="mt-1 w-full rounded border-slate-300 p-2 text-xs bg-white border outline-none" placeholder="Ex-Godown, F.O.R..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600">Term (Valid From)</label>
                  <input name="validFrom" type="date" className="mt-1 w-full rounded border-slate-300 p-2 text-xs bg-white border outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600">Till (Valid To)</label>
                  <input name="validTo" type="date" className="mt-1 w-full rounded border-slate-300 p-2 text-xs bg-white border outline-none" />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-4 border-t border-slate-100">
                 <button type="reset" className="px-6 py-2 border border-slate-300 text-slate-600 font-bold rounded hover:bg-slate-50 transition">Clear Form</button>
                 <button type="submit" className="px-8 py-2 bg-blue-700 text-white font-bold rounded shadow hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 active:scale-95 transition-all">
                   Save Sauda Entry
                 </button>
              </div>
            </form>
          </div>

          {/* Ledger / History Sidebar */}
          <div className="lg:col-span-4 bg-white shadow-md border border-slate-200 rounded-xl flex flex-col items-stretch max-h-[85vh]">
            <div className="bg-slate-50 border-b border-slate-200 p-4 shrink-0">
               <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900">
                 <Archive className="w-6 h-6 text-slate-600" /> Ledger - Recent Contracts
               </h2>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-2 bg-slate-100">
               {recentContracts.length === 0 ? (
                 <div className="p-8 text-center text-slate-400">
                    <p>No records found.</p>
                 </div>
               ) : recentContracts.map(c => (
                 <div key={c.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 flex flex-col gap-2 hover:border-blue-400 transition-colors">
                    <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                       <div>
                         <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 border border-blue-200 rounded">#{c.saudaNo}</span>
                         {c.saudaBook && <span className="ml-2 text-[10px] text-slate-400 uppercase">{c.saudaBook}</span>}
                       </div>
                       <span className="text-xs font-mono text-slate-500">{c.saudaDate?.split(' ')[0] || "N/A"}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                       <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Seller</p>
                          <p className="font-semibold text-slate-800 line-clamp-1">{c.sellerName}</p>
                       </div>
                       <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold text-right">Buyer</p>
                          <p className="font-semibold text-slate-800 text-right line-clamp-1">{c.buyerName}</p>
                       </div>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-50">
                       <p className="text-xs font-bold text-slate-700">{c.commodity}</p>
                       <p className="text-xs font-mono font-medium text-emerald-700 text-right">₹{c.amount?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="mt-2 text-right">
                       <a href={`/api/pdf/contract/${c.saudaNo}`} target="_blank" className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-3 py-1.5 rounded transition">
                         <Printer className="w-3.5 h-3.5" /> PRINT PDF
                       </a>
                    </div>
                 </div>
               ))}
            </div>
          </div>
          
        </div>
      </div>
    </main>
  );
}
