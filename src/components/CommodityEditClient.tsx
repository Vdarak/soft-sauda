'use client';

import { updateCommodity } from '@/app/actions/commodity';
import { Box, ArrowLeft, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function CommodityEditClient({ 
  commodity, 
  initialPackList, 
  initialSpecList 
}: { 
  commodity: any, 
  initialPackList: any[], 
  initialSpecList: any[] 
}) {
  const [packList, setPackList] = useState<any[]>(initialPackList);
  const [specList, setSpecList] = useState<any[]>(initialSpecList);

  const addPackRow = () => {
    setPackList([...packList, { packingWeight: '', packingType: 'Katta', sellerBrokerageRate: '', sellerBrokerageType: 'PQtl', buyerBrokerageRate: '', buyerBrokerageType: 'PQtl' }]);
  };

  const removePackRow = (index: number) => {
    setPackList(packList.filter((_, i) => i !== index));
  };

  const updatePackRow = (index: number, field: string, value: string) => {
    const fresh = [...packList];
    fresh[index][field] = value;
    setPackList(fresh);
  };

  const addSpecRow = () => {
    setSpecList([...specList, { specification: '', specValue: '', minMax: 'Max', remarks: '' }]);
  };

  const removeSpecRow = (index: number) => {
    setSpecList(specList.filter((_, i) => i !== index));
  };

  const updateSpecRow = (index: number, field: string, value: string) => {
    const fresh = [...specList];
    fresh[index][field] = value;
    setSpecList(fresh);
  };

  const updateAction = updateCommodity.bind(null, commodity.id);

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-sm text-slate-800 pb-20">
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        
        <header className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Link href="/commodities" className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Edit Commodity Master</h1>
              <p className="text-slate-500 text-sm">Update {commodity.name}</p>
            </div>
          </div>
        </header>

        <form action={updateAction} className="space-y-6 [&_input]:bg-white [&_input]:text-slate-900 [&_input]:placeholder:text-slate-500 [&_input:disabled]:text-slate-900 [&_input:disabled]:opacity-100 [&_select]:bg-white [&_select]:text-slate-900 [&_select:disabled]:text-slate-900 [&_select:disabled]:opacity-100 [&_textarea]:bg-white [&_textarea]:text-slate-900 [&_textarea]:placeholder:text-slate-500">
          <input type="hidden" name="packagingList" value={JSON.stringify(packList)} />
          <input type="hidden" name="specificationsList" value={JSON.stringify(specList)} />

          {/* Core Master Details */}
          <div className="bg-white shadow-md border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
               <h2 className="text-md font-bold flex items-center gap-2 text-slate-900">
                 <Box className="w-4 h-4 text-indigo-600" /> General Details
               </h2>
            </div>
            <div className="p-6 grid md:grid-cols-12 gap-6 bg-white">
               <div className="md:col-span-6">
                 <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Commodity Name *</label>
                 <input required name="name" defaultValue={commodity.name} type="text" className="w-full rounded border-slate-300 p-2.5 text-sm bg-white border outline-none font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500" />
               </div>
               <div className="md:col-span-3">
                 <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Group</label>
                 <select className="w-full rounded border-slate-300 p-2.5 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500">
                   <option>JOWAR</option>
                   <option>WHEAT</option>
                   <option>RICE</option>
                   <option>PULSES</option>
                 </select>
               </div>
               <div className="md:col-span-3">
                 <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Unit</label>
                 <select name="unit" defaultValue={commodity.unit || 'KG'} className="w-full rounded border-slate-300 p-2.5 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500">
                   <option>KG</option>
                   <option>QTL</option>
                   <option>MT</option>
                   <option>BAG</option>
                 </select>
               </div>
               <div className="md:col-span-8">
                 <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Description</label>
                 <input name="description" defaultValue={commodity.description || ''} type="text" className="w-full rounded border-slate-300 p-2.5 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500" />
               </div>
               <div className="md:col-span-2">
                 <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Short Name</label>
                 <input name="shortName" defaultValue={commodity.shortName || ''} type="text" className="w-full rounded border-slate-300 p-2.5 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
               </div>
               <div className="md:col-span-2">
                 <label className="block text-xs font-bold text-slate-600 uppercase mb-1">HSN Code</label>
                 <input name="hsnCode" defaultValue={commodity.hsnCode || ''} type="text" className="w-full rounded border-slate-300 p-2.5 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
               </div>
            </div>
          </div>

          {/* Brokerage Packaging Grid */}
          <div className="bg-white shadow-md border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
               <h2 className="text-md font-bold flex items-center gap-2 text-slate-900">
                 Brokerage & Packaging Definitions
               </h2>
               <button type="button" onClick={addPackRow} className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:text-indigo-800 transition-colors bg-indigo-50 px-2 py-1 rounded border border-indigo-200">
                 <Plus className="w-3 h-3" /> ADD ROW
               </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                 <thead className="bg-slate-100/50 border-b border-slate-200 text-slate-500 uppercase">
                    <tr>
                       <th className="px-3 py-2">Packing Size</th>
                       <th className="px-3 py-2">Bags/Bori/Box</th>
                       <th className="px-3 py-2">Brokerage Rate (Seller)</th>
                       <th className="px-3 py-2">Type (Seller)</th>
                       <th className="px-3 py-2">Brokerage Rate (Buyer)</th>
                       <th className="px-3 py-2">Type (Buyer)</th>
                       <th className="px-3 py-2 text-center w-10">Act</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {packList.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-slate-400 italic">No packaging defined. Press Add Row.</td>
                      </tr>
                    )}
                    {packList.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2"><input type="number" step="0.01" value={p.packingWeight || ''} onChange={(e)=>updatePackRow(i, 'packingWeight', e.target.value)} className="w-full border border-slate-300 rounded p-1.5 focus:border-indigo-500 outline-none" /></td>
                        <td className="p-2">
                           <select value={p.packingType || 'Katta'} onChange={(e)=>updatePackRow(i, 'packingType', e.target.value)} className="w-full border border-slate-300 rounded p-1.5 focus:border-indigo-500 outline-none bg-white">
                             <option>Katta</option><option>Bori</option><option>Box</option><option>Loose</option>
                           </select>
                        </td>
                        <td className="p-2"><input type="number" step="0.01" value={p.sellerBrokerageRate || ''} onChange={(e)=>updatePackRow(i, 'sellerBrokerageRate', e.target.value)} className="w-full border border-slate-300 rounded p-1.5 focus:border-indigo-500 outline-none" /></td>
                        <td className="p-2">
                           <select value={p.sellerBrokerageType || 'PQtl'} onChange={(e)=>updatePackRow(i, 'sellerBrokerageType', e.target.value)} className="w-full border border-slate-300 rounded p-1.5 focus:border-indigo-500 outline-none bg-white">
                             <option>PQtl</option><option>PBag</option><option>PMT</option><option>Percent</option>
                           </select>
                        </td>
                        <td className="p-2"><input type="number" step="0.01" value={p.buyerBrokerageRate || ''} onChange={(e)=>updatePackRow(i, 'buyerBrokerageRate', e.target.value)} className="w-full border border-slate-300 rounded p-1.5 focus:border-indigo-500 outline-none" /></td>
                        <td className="p-2">
                           <select value={p.buyerBrokerageType || 'PQtl'} onChange={(e)=>updatePackRow(i, 'buyerBrokerageType', e.target.value)} className="w-full border border-slate-300 rounded p-1.5 focus:border-indigo-500 outline-none bg-white">
                             <option>PQtl</option><option>PBag</option><option>PMT</option><option>Percent</option>
                           </select>
                        </td>
                        <td className="p-2 text-center">
                          <button type="button" onClick={()=>removePackRow(i)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
            </div>
          </div>

          {/* Specifications Grid */}
          <div className="bg-white shadow-md border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
               <h2 className="text-md font-bold flex items-center gap-2 text-slate-900">
                 Specification Details
               </h2>
               <button type="button" onClick={addSpecRow} className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:text-indigo-800 transition-colors bg-indigo-50 px-2 py-1 rounded border border-indigo-200">
                 <Plus className="w-3 h-3" /> ADD ROW
               </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                 <thead className="bg-slate-100/50 border-b border-slate-200 text-slate-500 uppercase">
                    <tr>
                       <th className="px-3 py-2 w-1/3">Specification</th>
                       <th className="px-3 py-2">Spec Value(%)</th>
                       <th className="px-3 py-2">Min / Max</th>
                       <th className="px-3 py-2 w-1/3">Remarks</th>
                       <th className="px-3 py-2 text-center w-10">Act</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {specList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-slate-400 italic">No quality specs defined. Press Add Row.</td>
                      </tr>
                    )}
                    {specList.map((s, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2">
                           <select value={s.specification || ''} onChange={(e)=>updateSpecRow(i, 'specification', e.target.value)} className="w-full border border-slate-300 rounded p-1.5 focus:border-indigo-500 outline-none bg-white">
                             <option value="">-- Select --</option>
                             <option>MOISTURE</option>
                             <option>DIRT/MUD</option>
                             <option>WEEVILED</option>
                             <option>BROKEN</option>
                           </select>
                        </td>
                        <td className="p-2"><input type="number" step="0.01" value={s.specValue || ''} onChange={(e)=>updateSpecRow(i, 'specValue', e.target.value)} className="w-full border border-slate-300 rounded p-1.5 focus:border-indigo-500 outline-none" /></td>
                        <td className="p-2">
                           <select value={s.minMax || 'Max'} onChange={(e)=>updateSpecRow(i, 'minMax', e.target.value)} className="w-full border border-slate-300 rounded p-1.5 focus:border-indigo-500 outline-none bg-white">
                             <option>Max</option><option>Min</option>
                           </select>
                        </td>
                        <td className="p-2"><input type="text" value={s.remarks || ''} onChange={(e)=>updateSpecRow(i, 'remarks', e.target.value)} className="w-full border border-slate-300 rounded p-1.5 focus:border-indigo-500 outline-none" /></td>
                        <td className="p-2 text-center">
                          <button type="button" onClick={()=>removeSpecRow(i)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-4">
             <Link href="/commodities" className="px-6 py-2.5 bg-white border border-slate-300 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition shadow-sm">Cancel</Link>
             <button type="submit" className="px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 active:scale-95 transition-all flex items-center gap-2">
               <CheckCircle2 className="w-4 h-4" /> Save Changes
             </button>
          </div>

        </form>
      </div>
    </main>
  );
}
