import { db } from '@/db';
import { ledger } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { updateLedgerEntry } from '@/app/actions/ledger';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';

export default async function EditLedgerEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);
  if (isNaN(id)) redirect('/ledger');

  const rows = await db.select().from(ledger).where(eq(ledger.id, id)).limit(1);
  if (rows.length === 0) redirect('/ledger');
  const entry = rows[0];

  const updateAction = updateLedgerEntry.bind(null, id);

  return (
    <main className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/ledger" className="p-2 hover:bg-slate-200 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-700" /></Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Edit Ledger Entry #{entry.id}</h1>
              <p className="text-sm text-slate-500">Soft-edit narration and amounts</p>
            </div>
          </div>
          <button form="ledger-form" type="submit" className="px-4 py-2 rounded-lg bg-slate-800 text-white font-semibold inline-flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
        </header>

        <form id="ledger-form" action={updateAction} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 [&_input]:bg-white [&_input]:text-slate-900 [&_input]:placeholder:text-slate-500 [&_input:disabled]:text-slate-900 [&_input:disabled]:opacity-100 [&_select]:bg-white [&_select]:text-slate-900 [&_select:disabled]:text-slate-900 [&_select:disabled]:opacity-100 [&_textarea]:bg-white [&_textarea]:text-slate-900 [&_textarea]:placeholder:text-slate-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Transaction Date</label>
              <input name="transactionDate" type="date" defaultValue={entry.transactionDate ? new Date(entry.transactionDate).toISOString().split('T')[0] : ''} className="mt-1 w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Voucher Ref</label>
              <input name="voucherRef" type="number" defaultValue={entry.sourceId || ''} className="mt-1 w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Account ID *</label>
              <input name="accountId" required type="number" defaultValue={entry.accountId} className="mt-1 w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Debit</label>
              <input name="debit" type="number" step="0.01" defaultValue={entry.debit || '0'} className="mt-1 w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase">Credit</label>
              <input name="credit" type="number" step="0.01" defaultValue={entry.credit || '0'} className="mt-1 w-full border rounded p-2" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 uppercase">Narration</label>
              <textarea name="narration" defaultValue={entry.narration || ''} rows={4} className="mt-1 w-full border rounded p-2" />
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
