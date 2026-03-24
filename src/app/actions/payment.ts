'use server'

import { db } from '@/db';
import { payments, bills } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

export async function createPayment(formData: FormData): Promise<void> {
  try {
    const billId = parseInt(formData.get("billId") as string, 10);
    const paymentDate = formData.get("paymentDate") as string;
    const instrumentType = formData.get("instrumentType") as string;
    const instrumentNo = formData.get("instrumentNo") as string;
    const instrumentDate = formData.get("instrumentDate") as string;
    const amount = parseFloat(formData.get("amount") as string) || 0;
    const depositedBank = formData.get("depositedBank") as string;
    
    if (!billId || amount <= 0) {
       console.error("Bill ID and valid Amount are required");
       return;
    }

    await db.insert(payments).values({
       billId,
       paymentDate: paymentDate || undefined,
       instrumentType,
       instrumentNo: instrumentNo || null,
       instrumentDate: instrumentDate || null,
       amount,
       depositedBank: depositedBank || null,
       voucherType: 'C',
    });

    const billRecord = await db.select().from(bills).where(eq(bills.id, billId)).limit(1);
    if (billRecord.length > 0) {
       const newReceived = (billRecord[0].amountReceived || 0) + amount;
       const newBalance = (billRecord[0].billAmount || 0) - (billRecord[0].deductions || 0) - newReceived;
       
       await db.update(bills).set({
          amountReceived: newReceived,
          balanceAmount: newBalance,
       }).where(eq(bills.id, billId));
    }

    revalidatePath('/payments');
    revalidatePath('/bills');
  } catch (err: any) {
    console.error("Failed to create payment:", err);
  }
}
