'use server'

import { db } from '@/db';
import { payments, paymentAllocations, bills } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export async function createPayment(formData: FormData): Promise<void> {
  try {
    const billId = parseInt(formData.get("billId") as string, 10);
    const paymentDate = formData.get("paymentDate") as string;
    const instrumentType = formData.get("instrumentType") as string;
    const instrumentNo = formData.get("instrumentNo") as string;
    const amount = parseFloat(formData.get("amount") as string) || 0;
    const depositedBank = formData.get("depositedBank") as string;
    
    if (!billId || amount <= 0) {
       console.error("Bill ID and valid Amount are required");
       return;
    }

    const billRecord = await db.select().from(bills).where(eq(bills.id, billId)).limit(1);
    if (!billRecord || billRecord.length === 0) throw new Error("Bill not found");
    const targetBill = billRecord[0];

    await db.transaction(async (tx) => {
        // 1. Create Payment header mapped to Party
        const [newPayment] = await tx.insert(payments).values({
           partyId: targetBill.partyId,
           paymentDate: paymentDate ? new Date(paymentDate) : undefined,
           instrumentType,
           instrumentNo: instrumentNo || null,
           amount: amount.toString(),
           depositedBank: depositedBank || null,
        }).returning({ id: payments.id });

        // 2. Map Payment Allocation tightly to the specific Bill
        await tx.insert(paymentAllocations).values({
           paymentId: newPayment.id,
           billId,
           allocatedAmount: amount.toString()
        });

        // 3. Update Bill Balance properly based on modernized database columns
        const newBalance = parseFloat(targetBill.balanceAmount) - amount;
        await tx.update(bills).set({
           balanceAmount: newBalance.toString()
        }).where(eq(bills.id, billId));
    });

    revalidatePath('/payments');
    revalidatePath('/bills');
  } catch (err: any) {
    console.error("Failed to create payment:", err);
  }
}

export async function updatePayment(paymentId: number, formData: FormData): Promise<void> {
   try {
      const paymentDate = formData.get("paymentDate") as string;
      const instrumentType = formData.get("instrumentType") as string;
      const instrumentNo = formData.get("instrumentNo") as string;
      const amount = parseFloat(formData.get("amount") as string) || 0;
      const depositedBank = formData.get("depositedBank") as string;

      if (amount <= 0) {
         console.error("Valid Amount is required");
         return;
      }

      const existingPayment = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
      if (existingPayment.length === 0) throw new Error("Payment not found");
      const oldAmount = Number(existingPayment[0].amount || 0);

      const allocations = await db.select().from(paymentAllocations).where(eq(paymentAllocations.paymentId, paymentId));
      if (allocations.length === 0) throw new Error("Payment allocation not found");
      if (allocations.length > 1 && oldAmount !== amount) {
         throw new Error("Cannot change payment amount with multiple allocations.");
      }

      await db.transaction(async (tx) => {
         await tx.update(payments).set({
            paymentDate: paymentDate ? new Date(paymentDate) : undefined,
            instrumentType,
            instrumentNo: instrumentNo || null,
            amount: amount.toString(),
            depositedBank: depositedBank || null,
         }).where(eq(payments.id, paymentId));

         if (allocations.length === 1 && oldAmount !== amount) {
            const allocation = allocations[0];
            await tx.update(paymentAllocations).set({
               allocatedAmount: amount.toString(),
            }).where(eq(paymentAllocations.id, allocation.id));

            const billRecord = await tx.select().from(bills).where(eq(bills.id, allocation.billId)).limit(1);
            if (billRecord.length > 0) {
               const currentBalance = Number(billRecord[0].balanceAmount || 0);
               const newBalance = currentBalance + oldAmount - amount;
               await tx.update(bills).set({
                  balanceAmount: newBalance.toString(),
               }).where(eq(bills.id, allocation.billId));
            }
         }
      });

      revalidatePath('/payments');
      revalidatePath('/bills');
   } catch (err: any) {
      console.error("Failed to update payment:", err);
      return;
   }

   redirect('/payments');
}
