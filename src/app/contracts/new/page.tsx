import { db } from '@/db';
import { parties, commodities } from '@/db/schema';
import { createContract } from '@/app/actions/contract';
import { PenLine, ArrowLeft } from 'lucide-react';
import VanillaInteractions from '@/components/VanillaInteractions';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function NewContractPage() {
  let availableParties: any[] = [];
  let availableCommodities: any[] = [];
  
  try {
    availableParties = await db.select().from(parties).limit(500);
    availableCommodities = await db.select().from(commodities).limit(200);
  } catch (err) {
    console.error("DB error fetching dropdowns:", err);
  }

  const INTERACTION_SCRIPT = `
    if (typeof document !== 'undefined') {
      const parties = ${JSON.stringify(availableParties)};
      const commodities = ${JSON.stringify(availableCommodities)};
      
      function setupAutocomplete(inputName, dropdownId, dataSet) {
         const input = document.querySelector(\`input[name="\${inputName}"]\`);
         const dropdown = document.getElementById(dropdownId);
         if (!input || !dropdown) return;
         
         let activeIndex = -1;

         document.addEventListener('click', (e) => {
            if (e.target !== input && !dropdown.contains(e.target)) {
               dropdown.classList.add('hidden');
            }
         });

         input.addEventListener('focus', () => input.dispatchEvent(new Event('input')));

         input.addEventListener('keydown', function(e) {
            if (dropdown.classList.contains('hidden')) return;
            
            const items = dropdown.querySelectorAll('.autocomplete-item');
            if (items.length === 0) return;

            if (e.key === 'ArrowDown') {
               e.preventDefault();
               activeIndex = (activeIndex + 1) % items.length;
               updateHighlight(items);
            } else if (e.key === 'ArrowUp') {
               e.preventDefault();
               activeIndex = (activeIndex - 1 + items.length) % items.length;
               updateHighlight(items);
            } else if (e.key === 'Enter') {
               e.preventDefault();
               const targetIndex = activeIndex >= 0 ? activeIndex : 0;
               if (items[targetIndex]) items[targetIndex].click();
            }
         });

         function updateHighlight(items) {
            items.forEach((item, idx) => {
               if (idx === activeIndex) {
                  item.classList.add('bg-blue-100');
                  item.classList.remove('hover:bg-slate-50');
               } else {
                  item.classList.remove('bg-blue-100');
                  item.classList.add('hover:bg-slate-50');
               }
            });
         }

         input.addEventListener('input', function(e) {
            activeIndex = -1;
            const val = e.target.value.toLowerCase();
            if (!val) {
               dropdown.classList.add('hidden');
               return;
            }
            
            const matches = dataSet.filter(p => (p.name || '').toLowerCase().includes(val)).slice(0, 10);
            if (matches.length === 0) {
               dropdown.classList.add('hidden');
               return;
            }
            
            dropdown.innerHTML = matches.map(p => 
              \`<div class="autocomplete-item px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 text-slate-700 font-medium border-b border-slate-100 last:border-0 hover:text-blue-600 transition-colors" data-name="\${p.name.replace(/"/g, '&quot;')}">
                 \${p.name}
               </div>\`
            ).join('');
            dropdown.classList.remove('hidden');
            
            dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
               item.addEventListener('click', function() {
                  input.value = this.getAttribute('data-name');
                  dropdown.classList.add('hidden');
                  input.dispatchEvent(new Event('input', { bubbles: true })); // Trigger autofill check
               });
            });
         });
      }

      setupAutocomplete('sellerName', 'sellerNameDropdown', parties);
      setupAutocomplete('buyerName', 'buyerNameDropdown', parties);
      setupAutocomplete('commodity', 'commodityDropdown', commodities);

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
      });
    }
  `;

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-sm text-slate-800 pb-20">
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Link href="/contracts" className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">New Sauda Entry</h1>
              <p className="text-slate-500 text-sm">Rapid trade contract registration</p>
            </div>
          </div>
        </header>

        {/* Main Data Entry Form */}
        <div className="bg-white shadow-md border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 p-4">
             <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900">
               <PenLine className="w-6 h-6 text-blue-600" /> Draft Trade Contract
             </h2>
          </div>
          
          <form action={createContract} className="p-6 space-y-6 flex-1 bg-white relative">
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
                <input name="saudaBook" type="text" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border focus:ring-2 focus:ring-blue-500 outline-none" defaultValue="Main Book" />
              </div>
            </div>

            {/* Row 2: Parties */}
            <div className="grid grid-cols-2 gap-6">
              {/* Seller Group */}
              <fieldset className="border border-slate-200 rounded-md p-4 bg-slate-50/50 relative focus-within:border-blue-300 focus-within:ring-1 focus-within:ring-blue-300 transition-all">
                <legend className="px-2 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white rounded border border-slate-200 ml-2">Seller Details</legend>
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 relative">
                      <label className="block text-xs font-bold text-slate-600">Company Name *</label>
                      <input required name="sellerName" type="text" autoComplete="off" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-blue-500 transition-colors" />
                      <div id="sellerNameDropdown" className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl hidden max-h-48 overflow-y-auto"></div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600">Broker</label>
                      <input name="sellerBroker" type="text" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
              </fieldset>

              {/* Buyer Group */}
              <fieldset className="border border-slate-200 rounded-md p-4 bg-slate-50/50 relative focus-within:border-emerald-300 focus-within:ring-1 focus-within:ring-emerald-300 transition-all">
                <legend className="px-2 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white rounded border border-slate-200 ml-2">Buyer Details</legend>
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 relative">
                      <label className="block text-xs font-bold text-slate-600">Company Name *</label>
                      <input required name="buyerName" type="text" autoComplete="off" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-emerald-500 transition-colors" />
                      <div id="buyerNameDropdown" className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl hidden max-h-48 overflow-y-auto"></div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600">Broker</label>
                      <input name="buyerBroker" type="text" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                  </div>
                </div>
              </fieldset>
            </div>

            {/* Row 3: Trade & Pricing */}
            <fieldset className="border border-slate-200 rounded-md p-4 bg-slate-50/50 mt-4 relative">
              <legend className="px-2 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white rounded border border-slate-200 ml-2">Trade Execution</legend>
              <div className="grid-cols-6 grid gap-4 pt-2">
                 <div className="col-span-2 relative">
                   <label className="block text-xs font-bold text-slate-600">Commodity *</label>
                   <input required name="commodity" autoComplete="off" type="text" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500" />
                   <div id="commodityDropdown" className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl hidden max-h-48 overflow-y-auto"></div>
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
                   <label className="block text-xs font-bold text-slate-600">Total Qty (Quintals)</label>
                   <input name="weight" type="number" step="0.01" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
                 </div>
                 <div className="col-span-2">
                   <label className="block text-xs font-bold text-slate-600">Agreed Rate (₹)</label>
                   <input name="rate" type="number" step="0.01" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
                 </div>
                 <div className="col-span-2">
                   <label className="block text-xs font-bold text-slate-400">Total Amount</label>
                   <input readOnly id="calcAmount" className="mt-1 w-full rounded border border-dashed border-slate-300 p-2 text-sm bg-slate-100 text-slate-600 font-mono italic outline-none cursor-not-allowed" placeholder="Auto-calculated" />
                 </div>
                 
                 <div className="col-span-3">
                   <label className="block text-xs font-bold text-slate-600">Delivery Term</label>
                   <input name="deliveryTerm" type="text" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex-Godown, F.O.R..." />
                 </div>
                 <div className="col-span-3">
                   <label className="block text-xs font-bold text-slate-600">Internal Remarks</label>
                   <input name="remarks" type="text" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500" />
                 </div>
              </div>
              
              <VanillaInteractions id="contracts-js-engine" html={INTERACTION_SCRIPT} />
            </fieldset>

            <div className="pt-4 flex justify-end gap-4 border-t border-slate-100">
               <Link href="/contracts" className="px-6 py-2 border border-slate-300 text-slate-600 font-bold rounded hover:bg-slate-50 transition">Cancel</Link>
               <button type="submit" className="px-8 py-2 bg-blue-700 text-white font-bold rounded shadow hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 active:scale-95 transition-all">
                 Save Sauda Entry
               </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
