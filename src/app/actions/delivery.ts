'use server'

import { db } from '@/db';
import { deliveries } from '@/db/schema';
import { revalidatePath } from 'next/cache';

export async function createDelivery(formData: FormData): Promise<void> {
  try {
    const contractId = parseInt(formData.get("contractId") as string, 10);
    const dispatchDate = formData.get("dispatchDate") as string;
    const truckNo = formData.get("truckNo") as string;
    const qStr = formData.get("quantity") as string;
    const wStr = formData.get("weight") as string;
    const fStr = formData.get("freightAdvance") as string;

    if (!contractId || !truckNo) {
       console.error("Contract ID and Truck No are required");
       return;
    }

    const quantity = qStr ? parseFloat(qStr) : null;
    const weight = wStr ? parseFloat(wStr) : null;
    const freightAdvance = fStr ? parseFloat(fStr) : null;

    await db.insert(deliveries).values({
       contractId,
       dispatchDate: dispatchDate || undefined,
       truckNo,
       quantity,
       weight,
       freightAdvance,
    });

    revalidatePath('/deliveries');
  } catch (err: any) {
    console.error("Failed to create delivery:", err);
  }
}
