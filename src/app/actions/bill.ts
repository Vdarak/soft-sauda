'use server'

import { db } from '@/db';
import { bills, billLines, ledger, parties, paymentAllocations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

async function getOrCreateParty(name: string): Promise<number | null> {
  if (!name || name.trim() === '') return null;
  const cleanName = name.trim();
  const existing = await db.select({ id: parties.id }).from(parties).where(eq(parties.name, cleanName)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const inserted = await db.insert(parties).values({ name: cleanName }).returning({ id: parties.id });
  return inserted[0].id;
}

export async function createBill(formData: FormData): Promise<void> {
  try {
    const billNo = formData.get("billNo") as string;
    if (!billNo) throw new Error("Bill Number is required");

    const billDateStr = formData.get("billDate") as string;
    const billDate = billDateStr ? new Date(billDateStr) : new Date();
    
    const partyName = formData.get("partyName") as string;
    const partyId = await getOrCreateParty(partyName);
    if (!partyId) throw new Error("A valid Party is required for billing.");

    const basis = formData.get("basis") as any;
    const amountRaw = formData.get("totalAmount") as string;
    const totalAmount = amountRaw ? parseFloat(amountRaw) : 0;
    
    if (totalAmount <= 0) throw new Error("Bill amount must be greater than zero.");

    // 1. Create the Bill Header
    const billResult = await db.insert(bills).values({
      billNo,
      billDate,
      partyId,
      basis,
      totalAmount: totalAmount.toString(),
      balanceAmount: totalAmount.toString(), // Outstanding is total initially
      creditDays: parseInt((formData.get("creditDays") as string) || "0", 10) || null,
    }).returning({ id: bills.id });

    const billId = billResult[0].id;

    // 2. Create the Bill Line (Single line item for rapid entry)
    const description = (formData.get("description") as string) || `Bill against ${basis}`;
    await db.insert(billLines).values({
      billId,
      description,
      amount: totalAmount.toString(),
      referenceType: basis,
      // referenceId could be parsed if we extended UI to select specific contracts/deliveries
    });

    // 3. Post to Financial Ledger (Debit the Party's Account)
    await db.insert(ledger).values({
      transactionDate: billDate,
      accountId: partyId,
      sourceType: 'BILL',
      sourceId: billId,
      debit: totalAmount.toString(),
      credit: '0.00',
      narration: `Bill Generated: #${billNo} (${basis})`
    });

  } catch (err: any) {
    console.error("Failed to process billing and ledger post:", err);
    return;
  }
  
  revalidatePath('/bills');
  redirect('/bills');
}

export async function updateBill(billId: number, formData: FormData): Promise<void> {
  try {
    const billNo = formData.get("billNo") as string;
    if (!billNo) throw new Error("Bill Number is required");

    const billDateStr = formData.get("billDate") as string;
    const billDate = billDateStr ? new Date(billDateStr) : new Date();

    const partyName = formData.get("partyName") as string;
    const partyId = await getOrCreateParty(partyName);
    if (!partyId) throw new Error("A valid Party is required for billing.");

    const basis = formData.get("basis") as any;
    const amountRaw = formData.get("totalAmount") as string;
    const totalAmount = amountRaw ? parseFloat(amountRaw) : 0;
    if (totalAmount <= 0) throw new Error("Bill amount must be greater than zero.");

    const existingBill = await db.select().from(bills).where(eq(bills.id, billId)).limit(1);
    if (existingBill.length === 0) throw new Error("Bill not found");

    const allocations = await db.select({ id: paymentAllocations.id }).from(paymentAllocations).where(eq(paymentAllocations.billId, billId)).limit(1);
    const hasAllocations = allocations.length > 0;

    if (hasAllocations) {
      if (existingBill[0].partyId !== partyId || existingBill[0].basis !== basis || Number(existingBill[0].totalAmount) !== totalAmount) {
        throw new Error("Bill is already allocated in payments. Only header text/date edits are allowed.");
      }
    }

    await db.transaction(async (tx) => {
      const newBalanceAmount = hasAllocations ? existingBill[0].balanceAmount : totalAmount.toString();

      await tx.update(bills).set({
        billNo,
        billDate,
        partyId,
        basis,
        totalAmount: totalAmount.toString(),
        balanceAmount: newBalanceAmount,
        creditDays: parseInt((formData.get("creditDays") as string) || "0", 10) || null,
      }).where(eq(bills.id, billId));

      const description = (formData.get("description") as string) || `Bill against ${basis}`;
      const firstLine = await tx.select().from(billLines).where(eq(billLines.billId, billId)).limit(1);
      if (firstLine.length > 0) {
        await tx.update(billLines).set({
          description,
          amount: totalAmount.toString(),
          referenceType: basis,
        }).where(eq(billLines.id, firstLine[0].id));
      } else {
        await tx.insert(billLines).values({
          billId,
          description,
          amount: totalAmount.toString(),
          referenceType: basis,
        });
      }
    });
  } catch (err: any) {
    console.error("Failed to update bill:", err);
    return;
  }

  revalidatePath('/bills');
  redirect('/bills');
}
