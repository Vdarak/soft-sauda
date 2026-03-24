'use server'

import { db } from '@/db';
import { ledger } from '@/db/schema';
import { revalidatePath } from 'next/cache';

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
       transactionDate: transactionDate || undefined,
       accountId,
       narration: narration || null,
       voucherRef,
       debit: type === 'debit' ? amount : 0,
       credit: type === 'credit' ? amount : 0,
    });

    revalidatePath('/ledger');
  } catch (err: any) {
    console.error("Failed to create journal entry:", err);
  }
}
