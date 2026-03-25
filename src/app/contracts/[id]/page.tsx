import { db } from '@/db';
import { commodities, contractLines, contractParties, contracts, parties } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { updateContract } from '@/app/actions/contract';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';

export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);
  if (isNaN(id)) redirect('/contracts');

  const contractRows = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
  if (contractRows.length === 0) redirect('/contracts');
  const contract = contractRows[0];

  const lineRows = await db.select().from(contractLines).where(eq(contractLines.contractId, id)).limit(1);
  const line = lineRows[0] || null;

  const partyRows = await db.select({ role: contractParties.role, name: parties.name })
    .from(contractParties)
    .innerJoin(parties, eq(contractParties.partyId, parties.id))
    .where(eq(contractParties.contractId, id));

  const commodityName = line?.commodityId
    ? (await db.select({ name: commodities.name }).from(commodities).where(eq(commodities.id, line.commodityId)).limit(1))[0]?.name || ''
    : '';

  const sellerName = partyRows.find((p) => p.role === 'SELLER')?.name || '';
  const buyerName = partyRows.find((p) => p.role === 'BUYER')?.name || '';
  const sellerBroker = partyRows.find((p) => p.role === 'SELLER_BROKER')?.name || '';
  const buyerBroker = partyRows.find((p) => p.role === 'BUYER_BROKER')?.name || '';

  const updateAction = updateContract.bind(null, id);

  return (
    <main className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-5xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/contracts" className="p-2 hover:bg-slate-200 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-700" /></Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Edit Contract #{contract.saudaNo}</h1>
              <p className="text-sm text-slate-500">Update Sauda details</p>
            </div>
          </div>
          <button form="contract-form" type="submit" className="px-4 py-2 rounded-lg bg-blue-700 text-white font-semibold inline-flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
        </header>

        <form id="contract-form" action={updateAction} className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 [&_input]:bg-white [&_input]:text-slate-900 [&_input]:placeholder:text-slate-500 [&_input:disabled]:text-slate-900 [&_input:disabled]:opacity-100 [&_select]:bg-white [&_select]:text-slate-900 [&_select:disabled]:text-slate-900 [&_select:disabled]:opacity-100 [&_textarea]:bg-white [&_textarea]:text-slate-900 [&_textarea]:placeholder:text-slate-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Sauda No *</label>
              <input name="saudaNo" required defaultValue={contract.saudaNo} type="number" className="mt-1 w-full border rounded p-2 bg-white text-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Sauda Date</label>
              <input name="saudaDate" defaultValue={contract.saudaDate ? new Date(contract.saudaDate).toISOString().split('T')[0] : ''} type="date" className="mt-1 w-full border rounded p-2 bg-white text-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Sauda Book</label>
              <input name="saudaBook" defaultValue={contract.saudaBook || ''} type="text" className="mt-1 w-full border rounded p-2 bg-white text-slate-900" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Seller *</label>
              <input name="sellerName" required defaultValue={sellerName} type="text" className="mt-1 w-full border rounded p-2 bg-white text-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Seller Broker</label>
              <input name="sellerBroker" defaultValue={sellerBroker} type="text" className="mt-1 w-full border rounded p-2 bg-white text-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Buyer *</label>
              <input name="buyerName" required defaultValue={buyerName} type="text" className="mt-1 w-full border rounded p-2 bg-white text-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Buyer Broker</label>
              <input name="buyerBroker" defaultValue={buyerBroker} type="text" className="mt-1 w-full border rounded p-2 bg-white text-slate-900" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Commodity *</label>
              <input name="commodity" required defaultValue={commodityName} type="text" className="mt-1 w-full border rounded p-2 bg-white text-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Brand</label>
              <input name="brand" defaultValue={line?.brand || ''} type="text" className="mt-1 w-full border rounded p-2 bg-white text-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Packaging</label>
              <input name="packaging" defaultValue={''} type="text" className="mt-1 w-full border rounded p-2 bg-white text-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Weight (Qtls)</label>
              <input name="weight" defaultValue={line?.weightQuintals || ''} type="number" step="0.001" className="mt-1 w-full border rounded p-2 bg-white text-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Rate</label>
              <input name="rate" defaultValue={line?.rate || ''} type="number" step="0.01" className="mt-1 w-full border rounded p-2 bg-white text-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Delivery Term</label>
              <input name="deliveryTerm" defaultValue={contract.deliveryTerm || ''} type="text" className="mt-1 w-full border rounded p-2 bg-white text-slate-900" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase">Remarks</label>
            <input name="remarks" defaultValue={contract.customRemarks || ''} type="text" className="mt-1 w-full border rounded p-2 bg-white text-slate-900" />
          </div>
        </form>
      </div>
    </main>
  );
}
