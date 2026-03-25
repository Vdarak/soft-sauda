'use client';

import { generateBulkBills } from '@/app/actions/billGeneration';
import { CheckCircle2, ChevronRight, Filter } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function BulkBillClient({ parties, commodities }: { parties: any[], commodities: any[] }) {
  const [basis, setBasis] = useState('DELIVERY');
  const [selectedParties, setSelectedParties] = useState<number[]>([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [filterType, setFilterType] = useState('ALL');

  const toggleParty = (id: number) => {
    setSelectedParties(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const toggleItem = (id: number) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const selectAllParties = () => setSelectedParties(parties.map(p => p.id));
  const deselectAllParties = () => setSelectedParties([]);

  return (
    <div className="flex-1 bg-slate-50 flex flex-col h-full font-sans text-sm text-slate-800 pb-20 overflow-y-auto">
       <div className="max-w-7xl mx-auto w-full p-4 space-y-6">
         
         <header className="flex items-center justify-between py-2">
           <div className="flex flex-col">
             <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Bill Generation Utility <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">BULK</span>
             </h1>
             <p className="text-slate-500 text-sm">Batch process unbilled dispatches or contracts</p>
           </div>
         </header>

         <form action={generateBulkBills} className="bg-white shadow-md border border-slate-200 rounded-xl overflow-hidden flex flex-col">
           {/* Hidden encoded arrays */}
           <input type="hidden" name="selectedParties" value={JSON.stringify(selectedParties)} />
           <input type="hidden" name="selectedItems" value={JSON.stringify(selectedItems)} />

           {/* TOP PARAMETERS SECTION */}
           <div className="grid md:grid-cols-12 gap-6 p-6 bg-slate-50 border-b border-slate-200">
              
              {/* Billing Period & Date */}
              <div className="md:col-span-4 space-y-4">
                 <h3 className="font-bold text-slate-700 uppercase text-xs tracking-wider border-b border-slate-200 pb-2">Billing Period</h3>
                 <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 mb-1">From Date</label>
                      <input type="date" name="fromDate" defaultValue="2025-04-01" className="w-full text-sm border-slate-300 rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 mb-1">To Date</label>
                      <input type="date" name="toDate" defaultValue="2026-03-31" className="w-full text-sm border-slate-300 rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                 </div>
                 <div className="flex items-center gap-4 pt-2">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Bill Date *</label>
                      <input type="date" name="billDate" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full text-sm border-slate-300 rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none bg-indigo-50 border-indigo-200 font-bold" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Bills to Generate</label>
                      <input type="text" readOnly value={selectedParties.length} className="w-full text-sm border-slate-200 rounded p-2 bg-slate-100 text-slate-500 font-bold text-center" />
                    </div>
                 </div>
              </div>

              {/* Basis */}
              <div className="md:col-span-4 space-y-4 border-l border-slate-200 pl-6">
                 <h3 className="font-bold text-slate-700 uppercase text-xs tracking-wider border-b border-slate-200 pb-2">Bill Generation Basis</h3>
                 <div className="space-y-3 pt-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="radio" name="basis" value="CONTRACT" checked={basis === 'CONTRACT'} onChange={(e)=>setBasis('CONTRACT')} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                      <span className="text-sm font-semibold group-hover:text-indigo-700 transition-colors">Contract Based</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="radio" name="basis" value="DELIVERY" checked={basis === 'DELIVERY'} onChange={(e)=>setBasis('DELIVERY')} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                      <span className="text-sm font-semibold group-hover:text-indigo-700 transition-colors">Delivery Based</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="radio" name="basis" value="DIRECT" checked={basis === 'DIRECT'} onChange={(e)=>setBasis('DIRECT')} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                      <span className="text-sm font-semibold group-hover:text-indigo-700 transition-colors">Direct Delivery</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="radio" name="basis" value="DALALI" checked={basis === 'DALALI'} onChange={(e)=>setBasis('DALALI')} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                      <span className="text-sm font-semibold group-hover:text-indigo-700 transition-colors">Local Dalali Based</span>
                    </label>
                 </div>
              </div>

              {/* Filters */}
              <div className="md:col-span-4 space-y-4 border-l border-slate-200 pl-6">
                 <h3 className="font-bold text-slate-700 uppercase text-xs tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
                    <Filter className="w-3 h-3" /> Party Filter
                 </h3>
                 <div className="flex gap-4 pt-2 border-b border-slate-100 pb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={filterType === 'ALL'} onChange={()=>setFilterType('ALL')} className="text-indigo-600 focus:ring-indigo-500" />
                      <span className="text-sm font-semibold bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded">All Party</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={filterType === 'BUYER'} onChange={()=>setFilterType('BUYER')} className="text-indigo-600 focus:ring-indigo-500" />
                      <span className="text-sm font-semibold">Buyer Wise</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={filterType === 'SELLER'} onChange={()=>setFilterType('SELLER')} className="text-indigo-600 focus:ring-indigo-500" />
                      <span className="text-sm font-semibold">Seller Wise</span>
                    </label>
                 </div>
                 <div className="flex items-center gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                      <span className="text-sm font-semibold">Item Wise</span>
                    </label>
                    <div className="px-3 py-1 bg-slate-200 text-slate-700 rounded text-xs font-bold cursor-pointer hover:bg-slate-300">Station Wise</div>
                 </div>
              </div>

           </div>

           {/* DUAL CHECKBOX GRIDS */}
           <div className="grid md:grid-cols-2 p-6 gap-6 bg-white flex-1 min-h-[400px]">
              
              {/* Parties Grid */}
              <div className="border border-slate-300 rounded bg-white flex flex-col h-[400px]">
                 <div className="bg-slate-100 border-b border-slate-300 p-2 flex justify-between items-center sticky top-0">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Select Database Accounts ({parties.length})</span>
                 </div>
                 <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    {parties.map(p => (
                       <label key={p.id} className="flex items-center gap-3 p-1.5 hover:bg-indigo-50 rounded cursor-pointer transition-colors group">
                         <input type="checkbox" checked={selectedParties.includes(p.id)} onChange={()=>toggleParty(p.id)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                         <span className={`text-sm font-mono ${selectedParties.includes(p.id) ? 'text-indigo-800 font-bold' : 'text-slate-700 group-hover:text-indigo-700'}`}>{p.name}</span>
                       </label>
                    ))}
                 </div>
                 <div className="bg-slate-50 border-t border-slate-300 p-2 flex gap-2">
                    <button type="button" onClick={selectAllParties} className="flex-1 py-1.5 bg-white border border-slate-300 text-xs font-bold rounded hover:bg-slate-100">Select All</button>
                    <button type="button" onClick={deselectAllParties} className="flex-1 py-1.5 bg-white border border-slate-300 text-xs font-bold rounded hover:bg-slate-100">De-Select All</button>
                 </div>
              </div>

              {/* Commodities Grid */}
              <div className="border border-slate-300 rounded bg-white flex flex-col h-[400px]">
                 <div className="bg-slate-100 border-b border-slate-300 p-2 sticky top-0">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Select Traded Commodities ({commodities.length})</span>
                 </div>
                 <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    {commodities.map(c => (
                       <label key={c.id} className="flex items-center gap-3 p-1.5 hover:bg-indigo-50 rounded cursor-pointer transition-colors group">
                         <input type="checkbox" checked={selectedItems.includes(c.id)} onChange={()=>toggleItem(c.id)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                         <span className={`text-sm font-mono ${selectedItems.includes(c.id) ? 'text-indigo-800 font-bold' : 'text-slate-700 group-hover:text-indigo-700'}`}>{c.name}</span>
                       </label>
                    ))}
                 </div>
              </div>

           </div>

           {/* FOOTER ACTIONS */}
           <div className="bg-slate-100 border-t border-slate-200 p-4 flex items-center justify-between">
              <div className="flex gap-4">
                 <button type="button" className="px-4 py-2 border border-slate-300 bg-white text-slate-700 font-bold rounded text-sm hover:bg-slate-50 transition shadow-sm">Change Brokerage Rates</button>
                 <button type="button" className="px-4 py-2 border border-slate-300 bg-white text-slate-700 font-bold rounded text-sm hover:bg-slate-50 transition shadow-sm">Transfer Billing</button>
              </div>
              <div className="flex gap-4">
                 <Link href="/bills" className="px-6 py-2 border border-slate-300 text-slate-600 font-bold rounded hover:bg-slate-50 transition">Cancel</Link>
                 <button type="submit" disabled={selectedParties.length === 0} className="px-8 py-2 bg-indigo-600 text-white font-bold rounded shadow hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                   <CheckCircle2 className="w-5 h-5" /> F6 - Proceed
                 </button>
              </div>
           </div>

         </form>
       </div>
    </div>
  );
}
