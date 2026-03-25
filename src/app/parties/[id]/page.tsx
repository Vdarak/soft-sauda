import { Building2, Save, ArrowLeft, Building, BadgePercent, GraduationCap, MapPin, ReceiptText, Phone } from 'lucide-react';
import Link from 'next/link';
import { updateParty } from '@/app/actions/party';
import { db } from '@/db';
import { parties, partyTaxIds } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export default async function EditPartyPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);
  
  if (isNaN(id)) {
    redirect('/parties');
  }

  const partyQuery = await db.select().from(parties).where(eq(parties.id, id)).limit(1);
  if (partyQuery.length === 0) {
    redirect('/parties');
  }

  const party = partyQuery[0];
  const taxes = await db.select().from(partyTaxIds).where(eq(partyTaxIds.partyId, id));

  const gstin = taxes.find(t => t.taxType === 'GSTIN')?.taxValue || '';
  const vatTin = taxes.find(t => t.taxType === 'VAT_TIN')?.taxValue || '';
  const cstTin = taxes.find(t => t.taxType === 'CST_TIN')?.taxValue || '';
  const cstNo = taxes.find(t => t.taxType === 'CST_NO')?.taxValue || '';

  const updateAction = updateParty.bind(null, id);

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-sm text-slate-800 pb-20">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Link href="/parties" className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Edit Party Profile</h1>
              <p className="text-slate-500 text-sm">Update records for {party.name}</p>
            </div>
          </div>
          <button type="submit" form="party-form" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2 rounded-xl shadow-sm shadow-indigo-200 transition-all active:scale-95">
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </header>

        <form id="party-form" action={updateAction} className="space-y-6 [&_input]:bg-white [&_input]:text-slate-900 [&_input]:placeholder:text-slate-500 [&_input:disabled]:text-slate-900 [&_input:disabled]:opacity-100 [&_select]:bg-white [&_select]:text-slate-900 [&_select:disabled]:text-slate-900 [&_select:disabled]:opacity-100 [&_textarea]:bg-white [&_textarea]:text-slate-900 [&_textarea]:placeholder:text-slate-500">
          
          {/* General Info */}
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-slate-50/50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <Building className="w-5 h-5 text-indigo-600" />
                 <h2 className="font-bold text-slate-800 text-base">General Info</h2>
               </div>
               <label className="flex items-center gap-2 cursor-pointer bg-slate-100 px-3 py-1 rounded-full border border-slate-200 hover:bg-slate-200 transition-colors">
                 <input type="checkbox" name="isActive" value="true" defaultChecked={party.isActive} className="text-indigo-600 focus:ring-indigo-500 rounded" />
                 <span className="text-xs font-bold text-slate-700">Active Account</span>
               </label>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Party Name *</label>
                <input required name="name" defaultValue={party.name} type="text" className="w-full rounded-lg border-slate-300 p-2.5 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow" />
              </div>
              <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Location Details</h3>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Address</label>
                <input name="address" defaultValue={party.address || ''} type="text" className="w-full rounded-lg border-slate-300 p-2.5 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Landmark</label>
                <input name="landmark" defaultValue={party.landmark || ''} type="text" className="w-full rounded-lg border-slate-300 p-2.5 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Place / City</label>
                <input name="place" defaultValue={party.place || ''} type="text" className="w-full rounded-lg border-slate-300 p-2.5 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">State Name</label>
                <input name="stateName" defaultValue={party.stateName || ''} type="text" className="w-full rounded-lg border-slate-300 p-2.5 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Pin Code</label>
                <input name="pinCode" defaultValue={party.pinCode || ''} type="text" className="w-full rounded-lg border-slate-300 p-2.5 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Compliance Info */}
            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden h-fit">
              <div className="bg-slate-50/50 border-b border-slate-200 px-6 py-4 flex items-center gap-2">
                 <ReceiptText className="w-5 h-5 text-indigo-600" />
                 <h2 className="font-bold text-slate-800 text-base">Compliance</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">GSTIN</label>
                  <input name="gstin" defaultValue={gstin} type="text" className="w-full font-mono uppercase rounded-lg border-slate-300 p-2.5 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">VAT TIN</label>
                  <input name="vatTin" defaultValue={vatTin} type="text" className="w-full font-mono uppercase rounded-lg border-slate-300 p-2.5 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">CST TIN</label>
                    <input name="cstTin" defaultValue={cstTin} type="text" className="w-full font-mono uppercase rounded-lg border-slate-300 p-2.5 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">CST No</label>
                    <input name="cstNo" defaultValue={cstNo} type="text" className="w-full font-mono uppercase rounded-lg border-slate-300 p-2.5 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
              </div>
            </section>

            {/* Communication & Credit */}
            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden h-fit">
              <div className="bg-slate-50/50 border-b border-slate-200 px-6 py-4 flex items-center gap-2">
                 <Phone className="w-5 h-5 text-indigo-600" />
                 <h2 className="font-bold text-slate-800 text-base">Comms & Credit</h2>
              </div>
              <div className="p-6 grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Credit Limit (₹)</label>
                  <input name="creditLimit" defaultValue={party.creditLimit || ''} type="number" step="0.01" className="w-full font-mono rounded-lg border-slate-300 p-2.5 text-sm bg-slate-50 border outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="col-span-2 border-t border-slate-100 pt-4 mt-2"></div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Office Phone</label>
                  <input name="phone" defaultValue={party.phone || ''} type="text" className="w-full rounded-lg border-slate-300 p-2.5 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">SMS Mobile</label>
                  <input name="smsMobile" defaultValue={party.smsMobile || ''} type="text" className="w-full rounded-lg border-slate-300 p-2.5 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email IDs</label>
                  <input name="emailIds" defaultValue={party.emailIds || ''} type="text" className="w-full rounded-lg border-slate-300 p-2.5 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Fax</label>
                  <input name="fax" defaultValue={party.fax || ''} type="text" className="w-full rounded-lg border-slate-300 p-2.5 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mill</label>
                  <input name="mill" defaultValue={party.mill || ''} type="text" className="w-full rounded-lg border-slate-300 p-2.5 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Designation</label>
                  <input name="designation" defaultValue={party.designation || ''} type="text" className="w-full rounded-lg border-slate-300 p-2.5 text-sm bg-white border outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
            </section>

          </div>
        </form>

      </div>
    </main>
  );
}
