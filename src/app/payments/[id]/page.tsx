import { db } from '@/db';
import { bills, paymentAllocations, payments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { updatePayment } from '@/app/actions/payment';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';

export default async function EditPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);
  if (isNaN(id)) redirect('/payments');

  const paymentRows = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  if (paymentRows.length === 0) redirect('/payments');
  const payment = paymentRows[0];

  const allocations = await db.select().from(paymentAllocations).where(eq(paymentAllocations.paymentId, id));
  const refBill = allocations.length > 0
    ? (await db.select({ billNo: bills.billNo }).from(bills).where(eq(bills.id, allocations[0].billId)).limit(1))[0]?.billNo || ''
    : '';

  const updateAction = updatePayment.bind(null, id);

  return (
    <main className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/payments" className="p-2 hover:bg-slate-200 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-700" /></Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Edit Payment #{id}</h1>
              <p className="text-sm text-slate-500">Adjust receipt details</p>
            </div>
          </div>
          <button form="payment-form" type="submit" className="px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold inline-flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
        </header>

        <form id="payment-form" action={updateAction} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 [&_input]:bg-white [&_input]:text-slate-900 [&_input]:placeholder:text-slate-500 [&_input:disabled]:text-slate-900 [&_input:disabled]:opacity-100 [&_select]:bg-white [&_select]:text-slate-900 [&_select:disabled]:text-slate-900 [&_select:disabled]:opacity-100 [&_textarea]:bg-white [&_textarea]:text-slate-900 [&_textarea]:placeholder:text-slate-500">
          <div className="text-sm text-slate-600">Linked Bill: <span className="font-semibold">{refBill || 'Advance/Unspecified'}</span></div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Payment Date</label>
              <input name="paymentDate" type="date" defaultValue={payment.paymentDate ? new Date(payment.paymentDate).toISOString().split('T')[0] : ''} className="mt-1 w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Amount *</label>
              <input name="amount" required type="number" step="0.01" defaultValue={payment.amount} className="mt-1 w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Instrument Type</label>
              <input name="instrumentType" type="text" defaultValue={payment.instrumentType} className="mt-1 w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Instrument No</label>
              <input name="instrumentNo" type="text" defaultValue={payment.instrumentNo || ''} className="mt-1 w-full border rounded p-2" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 uppercase">Deposited Bank</label>
              <input name="depositedBank" type="text" defaultValue={payment.depositedBank || ''} className="mt-1 w-full border rounded p-2" />
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
