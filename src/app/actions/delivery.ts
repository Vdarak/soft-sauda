'use server'

import { db } from '@/db';
import { deliveries, deliveryLines, parties } from '@/db/schema';
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

export async function createDelivery(formData: FormData): Promise<void> {
  try {
    const dispatchDateStr = formData.get("dispatchDate") as string;
    const dispatchDate = dispatchDateStr ? new Date(dispatchDateStr) : new Date();
    
    const truckNo = (formData.get("truckNo") as string) || null;
    const transporterName = formData.get("transporterName") as string;
    const transporterId = await getOrCreateParty(transporterName);

    // Insert Delivery Header
    const devResult = await db.insert(deliveries).values({
      dispatchDate,
      truckNo,
      transporterId,
      status: 'DISPATCHED',
    }).returning({ id: deliveries.id });

    const deliveryId = devResult[0].id;

    // Resolve Contract Line Relation
    const contractLineIdRaw = formData.get("contractLineId") as string;
    if (!contractLineIdRaw) throw new Error("Contract Line ID is required to link this delivery.");
    const contractLineId = parseInt(contractLineIdRaw, 10);

    const dispatchedBagsRaw = formData.get("dispatchedBags") as string;
    const dispatchedWeightRaw = formData.get("dispatchedWeight") as string;
    
    if (!dispatchedWeightRaw) throw new Error("Dispatched weight is required.");

    // Insert Line
    await db.insert(deliveryLines).values({
      deliveryId,
      contractLineId,
      dispatchedBags: dispatchedBagsRaw ? parseFloat(dispatchedBagsRaw).toString() : null,
      dispatchedWeight: parseFloat(dispatchedWeightRaw).toString(),
    });

  } catch (err: any) {
    console.error("Failed to sequence delivery creation:", err);
    return;
  }
  
  revalidatePath('/deliveries');
  redirect('/deliveries');
}

export async function updateDelivery(deliveryId: number, formData: FormData): Promise<void> {
  try {
    const dispatchDateStr = formData.get("dispatchDate") as string;
    const dispatchDate = dispatchDateStr ? new Date(dispatchDateStr) : new Date();

    const truckNo = (formData.get("truckNo") as string) || null;
    const transporterName = formData.get("transporterName") as string;
    const transporterId = await getOrCreateParty(transporterName);

    const contractLineIdRaw = formData.get("contractLineId") as string;
    if (!contractLineIdRaw) throw new Error("Contract Line ID is required.");
    const contractLineId = parseInt(contractLineIdRaw, 10);

    const dispatchedBagsRaw = formData.get("dispatchedBags") as string;
    const dispatchedWeightRaw = formData.get("dispatchedWeight") as string;
    if (!dispatchedWeightRaw) throw new Error("Dispatched weight is required.");

    await db.transaction(async (tx) => {
      await tx.update(deliveries).set({
        dispatchDate,
        truckNo,
        transporterId,
      }).where(eq(deliveries.id, deliveryId));

      const existingLine = await tx.select().from(deliveryLines).where(eq(deliveryLines.deliveryId, deliveryId)).limit(1);
      if (existingLine.length > 0) {
        await tx.update(deliveryLines).set({
          contractLineId,
          dispatchedBags: dispatchedBagsRaw ? parseFloat(dispatchedBagsRaw).toString() : null,
          dispatchedWeight: parseFloat(dispatchedWeightRaw).toString(),
        }).where(eq(deliveryLines.id, existingLine[0].id));
      } else {
        await tx.insert(deliveryLines).values({
          deliveryId,
          contractLineId,
          dispatchedBags: dispatchedBagsRaw ? parseFloat(dispatchedBagsRaw).toString() : null,
          dispatchedWeight: parseFloat(dispatchedWeightRaw).toString(),
        });
      }
    });
  } catch (err: any) {
    console.error("Failed to update delivery:", err);
    return;
  }

  revalidatePath('/deliveries');
  redirect('/deliveries');
}
