import { db } from '@/db';
import { parties } from '@/db/schema';
import { createBill } from '@/app/actions/bill';
import { Receipt, ArrowLeft } from 'lucide-react';
import VanillaInteractions from '@/components/VanillaInteractions';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function NewBillPage() {
  let availableParties: any[] = [];
  
  try {
    availableParties = await db.select().from(parties).limit(500);
  } catch (err) {
    console.error("DB error fetching dropdowns:", err);
  }

  // Define stringified inline JS payload for component to mount natively
  const INTERACTION_SCRIPT = `
    if (typeof document !== 'undefined') {
      const parties = ${JSON.stringify(availableParties)};
      const input = document.querySelector('input[name="partyName"]');
      const dropdown = document.getElementById('partyDropdown');
      const gstinInput = document.getElementById('partyGstin');
      const stateInput = document.getElementById('partyState');

      if (input && dropdown) {
        document.addEventListener('click', (e) => {
            if (e.target !== input && !dropdown.contains(e.target)) {
              dropdown.classList.add('hidden');
            }
        });

        input.addEventListener('focus', () => input.dispatchEvent(new Event('input')));

        input.addEventListener('input', function(e) {
            const val = e.target.value.toLowerCase();
            
            // Reset autobinds
            if (gstinInput) gstinInput.value = '';
            if (stateInput) stateInput.value = '';

            if (!val) {
              dropdown.classList.add('hidden');
              return;
            }
            
            const exactMatch = parties.find(p => p.name.toLowerCase() === val);
            if (exactMatch) {
                if (gstinInput) gstinInput.value = exactMatch.gstin || 'No GSTIN';
                if (stateInput) stateInput.value = exactMatch.stateName || 'Unknown State';
            }

            const matches = parties.filter(p => (p.name || '').toLowerCase().includes(val)).slice(0, 10);
            if (matches.length === 0) {
              dropdown.classList.add('hidden');
              return;
            }
            
            dropdown.innerHTML = matches.map(p => 
              \`<div class="px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 text-slate-700 font-medium border-b border-slate-100 last:border-0 hover:text-orange-600" data-name="\${p.name.replace(/"/g, '&quot;')}">
                \${p.name}
              </div>\`
            ).join('');
            dropdown.classList.remove('hidden');
            
            dropdown.querySelectorAll('div').forEach(item => {
              item.addEventListener('click', function() {
                  input.value = this.getAttribute('data-name');
                  dropdown.classList.add('hidden');
                  input.dispatchEvent(new Event('input', {bubbles: true})); // trigger exact match population
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
            <Link href="/bills" className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Generate Invoice</h1>
              <p className="text-slate-500 text-sm">Create a bill to automatically post to the financial ledger</p>
            </div>
          </div>
        </header>

        {/* Form Container */}
        <div className="bg-white shadow-md border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 p-4">
             <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900">
               <Receipt className="w-5 h-5 text-orange-600" /> Bill Entry
             </h2>
          </div>
          
          <form action={createBill} className="p-6 space-y-8 flex-1 bg-white relative">
            
            {/* Context: Header */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-orange-50/50 rounded-lg border border-orange-100/50">
               <div>
                 <label className="block text-xs font-bold text-slate-600 uppercase">Bill No. *</label>
                 <input required name="billNo" type="text" className="mt-1 w-full rounded border-slate-300 p-2 text-sm uppercase bg-white border focus:ring-2 focus:ring-orange-500 font-bold outline-none" placeholder="INV-26-" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-600 uppercase">Bill Date *</label>
                 <input required name="billDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-orange-500" />
               </div>
               <div className="col-span-2">
                 <label className="block text-xs font-bold text-slate-600 uppercase">Billing Basis *</label>
                 <select required name="basis" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none font-bold text-slate-700 focus:ring-2 focus:ring-orange-500">
                    <option value="CONTRACT">Trade Contract</option>
                    <option value="DELIVERY">Delivery / Dispatch</option>
                    <option value="DIRECT">Direct Sale</option>
                    <option value="DALALI">Dalali / Brokerage</option>
                 </select>
               </div>
            </div>

            {/* Row: Party & Amount */}
            <div className="grid md:grid-cols-2 gap-6">
               <fieldset className="border border-slate-200 rounded-md p-4 bg-slate-50/50 relative focus-within:border-orange-300 focus-within:ring-1 focus-within:ring-orange-300 transition-all">
                  <legend className="px-2 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white rounded border border-slate-200 ml-2">Billed To (Party)</legend>
                  <div className="space-y-4 pt-2">
                     <div className="relative">
                       <label className="block text-xs font-bold text-slate-600">Party Name (Debit Account) *</label>
                       <input required name="partyName" type="text" autoComplete="off" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-orange-500 transition-colors" placeholder="Type to search party..." />
                       <div id="partyDropdown" className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl hidden max-h-48 overflow-y-auto"></div>
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">GSTIN (Auto-fill)</label>
                          <input readOnly id="partyGstin" type="text" className="mt-1 w-full rounded border border-slate-200 p-1.5 text-xs bg-slate-100 outline-none text-slate-500 cursor-not-allowed" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">State (Auto-fill)</label>
                          <input readOnly id="partyState" type="text" className="mt-1 w-full rounded border border-slate-200 p-1.5 text-xs bg-slate-100 outline-none text-slate-500 cursor-not-allowed" />
                        </div>
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-slate-600">Credit Days Allowed</label>
                       <input name="creditDays" type="number" defaultValue="30" className="mt-1 w-24 rounded border-slate-300 p-2 text-sm bg-white border outline-none font-mono focus:ring-2 focus:ring-orange-500" />
                     </div>
                  </div>
               </fieldset>

               <fieldset className="border border-slate-200 rounded-md p-4 bg-slate-50/50 relative focus-within:border-orange-300 focus-within:ring-1 focus-within:ring-orange-300 transition-all">
                  <legend className="px-2 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white rounded border border-slate-200 ml-2">Invoice Totals</legend>
                  <div className="space-y-4 pt-2">
                     <div>
                       <label className="block text-xs font-bold text-slate-600">Description / Particulars</label>
                       <input name="description" type="text" className="mt-1 w-full rounded border-slate-300 p-2 text-sm bg-white border outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g. Brokering charges for 200 Quintals..." />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-slate-600">Net Invoice Value (₹) *</label>
                       <input required name="totalAmount" type="number" step="0.01" className="mt-1 w-full rounded border-slate-300 p-3 text-lg bg-white border outline-none focus:ring-2 focus:ring-orange-500 font-mono text-emerald-700 font-bold shadow-inner" placeholder="0.00" />
                     </div>
                  </div>
               </fieldset>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
               <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Automatic Ledger Deduction active
               </div>
               <div className="flex gap-4">
                 <Link href="/bills" className="px-6 py-2 border border-slate-300 text-slate-600 font-bold rounded hover:bg-slate-50 transition">Cancel</Link>
                 <button type="submit" className="px-8 py-2 bg-orange-600 text-white font-bold rounded shadow hover:bg-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-300 active:scale-95 transition-all">
                   Finalize Bill
                 </button>
               </div>
            </div>

            <VanillaInteractions id="bills-js-engine" html={INTERACTION_SCRIPT} />
          </form>
        </div>
      </div>
    </main>
  );
}
