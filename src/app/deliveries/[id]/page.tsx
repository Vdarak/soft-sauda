import { db } from '@/db';
import { contractLines, contracts, deliveries, deliveryLines, parties, commodities } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { updateDelivery } from '@/app/actions/delivery';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';

export default async function EditDeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);
  if (isNaN(id)) redirect('/deliveries');

  const deliveryRows = await db.select().from(deliveries).where(eq(deliveries.id, id)).limit(1);
  if (deliveryRows.length === 0) redirect('/deliveries');
  const delivery = deliveryRows[0];

  const lineRows = await db.select().from(deliveryLines).where(eq(deliveryLines.deliveryId, id)).limit(1);
  const line = lineRows[0] || null;

  const transporterName = delivery.transporterId
    ? (await db.select({ name: parties.name }).from(parties).where(eq(parties.id, delivery.transporterId)).limit(1))[0]?.name || ''
    : '';

  const openLines = await db.select({
    lineId: contractLines.id,
    saudaNo: contracts.saudaNo,
    saudaBook: contracts.saudaBook,
    commodityName: commodities.name,
    totalWeight: contractLines.weightQuintals,
    rate: contractLines.rate,
  })
    .from(contractLines)
    .innerJoin(contracts, eq(contractLines.contractId, contracts.id))
    .innerJoin(commodities, eq(contractLines.commodityId, commodities.id))
    .where(eq(contracts.status, 'ACTIVE'))
    .orderBy(desc(contracts.saudaNo))
    .limit(300);

  const updateAction = updateDelivery.bind(null, id);

  return (
    <main className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/deliveries" className="p-2 hover:bg-slate-200 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-700" /></Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Edit Delivery #{id}</h1>
              <p className="text-sm text-slate-500">Update dispatch record</p>
            </div>
          </div>
          <button form="delivery-form" type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold inline-flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
        </header>

        <form id="delivery-form" action={updateAction} className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 [&_input]:bg-white [&_input]:text-slate-900 [&_input]:placeholder:text-slate-500 [&_input:disabled]:text-slate-900 [&_input:disabled]:opacity-100 [&_select]:bg-white [&_select]:text-slate-900 [&_select:disabled]:text-slate-900 [&_select:disabled]:opacity-100 [&_textarea]:bg-white [&_textarea]:text-slate-900 [&_textarea]:placeholder:text-slate-500">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase">Contract Line *</label>
            <select name="contractLineId" required defaultValue={line?.contractLineId?.toString() || ''} className="mt-1 w-full border rounded p-2">
              <option value="">-- Select --</option>
              {openLines.map((row) => (
                <option key={row.lineId} value={row.lineId}>
                  Sauda #{row.saudaNo} ({row.saudaBook}) - {row.commodityName} - {row.totalWeight} Qtls @ {row.rate}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Dispatch Date</label>
              <input name="dispatchDate" type="date" defaultValue={delivery.dispatchDate ? new Date(delivery.dispatchDate).toISOString().split('T')[0] : ''} className="mt-1 w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Truck No</label>
              <input name="truckNo" type="text" defaultValue={delivery.truckNo || ''} className="mt-1 w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Transporter</label>
              <input name="transporterName" type="text" defaultValue={transporterName} className="mt-1 w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Dispatched Bags</label>
              <input name="dispatchedBags" type="number" step="0.01" defaultValue={line?.dispatchedBags || ''} className="mt-1 w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Dispatched Weight *</label>
              <input name="dispatchedWeight" required type="number" step="0.001" defaultValue={line?.dispatchedWeight || ''} className="mt-1 w-full border rounded p-2" />
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
