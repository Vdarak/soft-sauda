'use server'

import { db } from '@/db';
import { ledger } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export async function createJournalEntry(formData: FormData): Promise<void> {
  try {
    const transactionDate = formData.get("transactionDate") as string;
    const accountId = formData.get("accountId") as string;
    const narration = formData.get("narration") as string;
    const vStr = formData.get("voucherRef") as string;
    const type = formData.get("type") as string; // 'debit' or 'credit'
    const amount = parseFloat(formData.get("amount") as string) || 0;

    if (!accountId || amount <= 0) {
       console.error("Account ID and Amount are required");
       return;
    }

    const voucherRef = vStr ? parseInt(vStr, 10) : null;

    await db.insert(ledger).values({
       transactionDate: transactionDate ? new Date(transactionDate) : undefined,
       accountId: parseInt(accountId, 10),
       sourceType: 'MANUAL',
       sourceId: voucherRef,
       narration: narration || null,
       debit: type === 'debit' ? amount.toString() : "0.00",
       credit: type === 'credit' ? amount.toString() : "0.00",
    });

    revalidatePath('/ledger');
  } catch (err: any) {
    console.error("Failed to create journal entry:", err);
  }
}

export async function updateLedgerEntry(id: number, formData: FormData): Promise<void> {
  try {
    const transactionDate = formData.get("transactionDate") as string;
    const accountIdRaw = formData.get("accountId") as string;
    const narration = formData.get("narration") as string;
    const sourceIdRaw = formData.get("voucherRef") as string;
    const debitRaw = formData.get("debit") as string;
    const creditRaw = formData.get("credit") as string;

    const accountId = parseInt(accountIdRaw, 10);
    const sourceId = sourceIdRaw ? parseInt(sourceIdRaw, 10) : null;
    const debit = debitRaw ? parseFloat(debitRaw) : 0;
    const credit = creditRaw ? parseFloat(creditRaw) : 0;

    if (!accountId || (debit <= 0 && credit <= 0)) {
      console.error("Account ID and one positive amount are required");
      return;
    }

    await db.update(ledger).set({
      transactionDate: transactionDate ? new Date(transactionDate) : undefined,
      accountId,
      sourceId,
      narration: narration || null,
      debit: debit > 0 ? debit.toString() : "0.00",
      credit: credit > 0 ? credit.toString() : "0.00",
    }).where(eq(ledger.id, id));

    revalidatePath('/ledger');
  } catch (err: any) {
    console.error("Failed to update ledger entry:", err);
    return;
  }

  redirect('/ledger');
}
