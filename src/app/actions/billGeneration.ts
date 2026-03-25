'use server'

import { db } from '@/db';
import { bills, billLines } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function generateBulkBills(formData: FormData) {
  try {
    const basis = formData.get("basis") as any;
    const billDateStr = formData.get("billDate") as string;
    
    // Parse the JSON array of selected party IDs
    const partiesRaw = formData.get("selectedParties") as string;
    const selectedParties = partiesRaw ? JSON.parse(partiesRaw) : [];
    
    if (selectedParties.length === 0) {
      throw new Error("No parties selected for billing");
    }

    await db.transaction(async (tx) => {
       for (const partyId of selectedParties) {
          // Generate a unique sequential bulk bill number
          const billNo = `BULK-${basis.substring(0,3)}-${Math.floor(Math.random() * 10000)}-PID${partyId}`;
          
          // 1. Insert Master Bill Header
          const [newBill] = await tx.insert(bills).values({
             billNo,
             billDate: new Date(billDateStr),
             partyId: parseInt(partyId),
             basis: basis,
             totalAmount: "0.00", // Would be sum of unbilled deliveries/contracts
             balanceAmount: "0.00",
             creditDays: 15
          }).returning({ id: bills.id });

          // 2. Insert Bill Line summarizing the bulk generation
          await tx.insert(billLines).values({
             billId: newBill.id,
             description: `Auto-Generated Bulk Invoice [Basis: ${basis}]`,
             amount: "0.00",
          });
       }
    });

    revalidatePath('/bills');
    revalidatePath('/ledger');
  } catch (err: any) {
    console.error("Bulk Billing Generation Error:", err);
    throw err;
  }
  
  redirect('/bills');
}
