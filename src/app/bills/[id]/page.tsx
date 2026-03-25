import { db } from '@/db';
import { billLines, bills, parties, paymentAllocations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { updateBill } from '@/app/actions/bill';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';

export default async function EditBillPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);
  if (isNaN(id)) redirect('/bills');

  const billRows = await db.select().from(bills).where(eq(bills.id, id)).limit(1);
  if (billRows.length === 0) redirect('/bills');
  const bill = billRows[0];

  const firstLine = (await db.select().from(billLines).where(eq(billLines.billId, id)).limit(1))[0] || null;
  const hasAllocations = (await db.select({ id: paymentAllocations.id }).from(paymentAllocations).where(eq(paymentAllocations.billId, id)).limit(1)).length > 0;

  const partyName = (await db.select({ name: parties.name }).from(parties).where(eq(parties.id, bill.partyId)).limit(1))[0]?.name || '';
  const updateAction = updateBill.bind(null, id);

  return (
    <main className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/bills" className="p-2 hover:bg-slate-200 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-700" /></Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Edit Bill {bill.billNo}</h1>
              <p className="text-sm text-slate-500">Update invoice header and values</p>
            </div>
          </div>
          <button form="bill-form" type="submit" className="px-4 py-2 rounded-lg bg-orange-600 text-white font-semibold inline-flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
        </header>

        {hasAllocations && (
          <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-sm">
            Payment allocations already exist. Amount, basis, and party are locked for integrity.
          </div>
        )}

        <form id="bill-form" action={updateAction} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 [&_input]:bg-white [&_input]:text-slate-900 [&_input]:placeholder:text-slate-500 [&_input:disabled]:text-slate-900 [&_input:disabled]:opacity-100 [&_select]:bg-white [&_select]:text-slate-900 [&_select:disabled]:text-slate-900 [&_select:disabled]:opacity-100 [&_textarea]:bg-white [&_textarea]:text-slate-900 [&_textarea]:placeholder:text-slate-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Bill No *</label>
              <input name="billNo" required defaultValue={bill.billNo} type="text" className="mt-1 w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Bill Date</label>
              <input name="billDate" defaultValue={bill.billDate ? new Date(bill.billDate).toISOString().split('T')[0] : ''} type="date" className="mt-1 w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Credit Days</label>
              <input name="creditDays" defaultValue={bill.creditDays || ''} type="number" className="mt-1 w-full border rounded p-2" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Party *</label>
              <input name="partyName" required defaultValue={partyName} type="text" readOnly={hasAllocations} className="mt-1 w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Basis *</label>
              <select name="basis" defaultValue={bill.basis} disabled={hasAllocations} className="mt-1 w-full border rounded p-2 disabled:bg-slate-100">
                <option value="CONTRACT">Contract</option>
                <option value="DELIVERY">Delivery</option>
                <option value="DIRECT">Direct</option>
                <option value="DALALI">Dalali</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Total Amount *</label>
              <input name="totalAmount" required defaultValue={bill.totalAmount} type="number" step="0.01" readOnly={hasAllocations} className="mt-1 w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Description</label>
              <input name="description" defaultValue={firstLine?.description || ''} type="text" className="mt-1 w-full border rounded p-2" />
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
