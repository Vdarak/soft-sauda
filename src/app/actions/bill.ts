'use server'

import { db } from '@/db';
import { bills } from '@/db/schema';
import { revalidatePath } from 'next/cache';

export async function createBill(formData: FormData): Promise<void> {
  try {
    const contractId = parseInt(formData.get("contractId") as string, 10);
    const dIdStr = formData.get("deliveryId") as string;
    const billNo = formData.get("billNo") as string;
    const billDate = formData.get("billDate") as string;
    
    if (!contractId || !billNo) {
       console.error("Contract ID and Bill No are required");
       return;
    }

    const deliveryId = dIdStr ? parseInt(dIdStr, 10) : null;
    const billAmount = parseFloat(formData.get("billAmount") as string) || 0;
    const deductions = parseFloat(formData.get("deductions") as string) || 0;
    const creditDays = parseInt(formData.get("creditDays") as string, 10) || 0;
    const balanceAmount = billAmount - deductions;

    await db.insert(bills).values({
       contractId,
       deliveryId,
       billNo,
       billDate: billDate || undefined,
       billAmount,
       amountReceived: 0,
       deductions,
       balanceAmount,
       creditDays,
    });

    revalidatePath('/bills');
  } catch (err: any) {
    console.error("Failed to create bill:", err);
  }
}
