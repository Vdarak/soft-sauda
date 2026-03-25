'use server'

import { db } from '@/db';
import { contracts, contractParties, contractLines, parties, commodities, commodityPackaging } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
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

async function getOrCreateCommodity(name: string): Promise<number> {
  const cleanName = name.trim();
  const existing = await db.select({ id: commodities.id }).from(commodities).where(eq(commodities.name, cleanName)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const inserted = await db.insert(commodities).values({ name: cleanName }).returning({ id: commodities.id });
  return inserted[0].id;
}

async function getOrCreatePackaging(commodityId: number, packName: string): Promise<number | null> {
  if (!packName || packName.trim() === '') return null;
  const cleanName = packName.trim();
  const existing = await db.select({ id: commodityPackaging.id }).from(commodityPackaging)
    .where(and(eq(commodityPackaging.commodityId, commodityId), eq(commodityPackaging.packingType, cleanName))).limit(1);
  if (existing.length > 0) return existing[0].id;
  const inserted = await db.insert(commodityPackaging).values({ commodityId, packingType: cleanName, packingWeight: "0" }).returning({ id: commodityPackaging.id });
  return inserted[0].id;
}

export async function createContract(formData: FormData): Promise<void> {
  try {
    // 1. Identifiers & Dates
    const saudaNoRaw = formData.get("saudaNo") as string;
    if (!saudaNoRaw) throw new Error("Sauda No is required");
    const saudaNo = parseInt(saudaNoRaw, 10);
    
    const saudaBook = (formData.get("saudaBook") as string) || "Main Book";
    const saudaDateStr = formData.get("saudaDate") as string;
    const saudaDate = saudaDateStr ? new Date(saudaDateStr) : new Date();

    const deliveryTerm = formData.get("deliveryTerm") as string;

    // 2. Resolve Master Data FKs
    const commodityName = formData.get("commodity") as string;
    if (!commodityName) throw new Error("Commodity is required");
    const commodityId = await getOrCreateCommodity(commodityName);

    const packagingName = formData.get("packaging") as string;
    const packagingId = await getOrCreatePackaging(commodityId, packagingName);

    const sellerId = await getOrCreateParty(formData.get("sellerName") as string);
    const buyerId = await getOrCreateParty(formData.get("buyerName") as string);
    const sellerBrokerId = await getOrCreateParty(formData.get("sellerBroker") as string);
    const buyerBrokerId = await getOrCreateParty(formData.get("buyerBroker") as string);

    if (!sellerId || !buyerId) throw new Error("Seller and Buyer are required");

    // 3. Insert Base Contract
    const contractResult = await db.insert(contracts).values({
      saudaNo,
      saudaBook,
      saudaDate,
      deliveryTerm: deliveryTerm || null,
      status: 'ACTIVE',
      customRemarks: (formData.get("remarks") as string) || null,
    }).returning({ id: contracts.id });

    const contractId = contractResult[0].id;

    // 4. Insert Contract Parties
    const partyInserts = [];
    partyInserts.push({ contractId, partyId: sellerId, role: 'SELLER' as const });
    partyInserts.push({ contractId, partyId: buyerId, role: 'BUYER' as const });
    if (sellerBrokerId) partyInserts.push({ contractId, partyId: sellerBrokerId, role: 'SELLER_BROKER' as const });
    if (buyerBrokerId && buyerBrokerId !== sellerBrokerId) partyInserts.push({ contractId, partyId: buyerBrokerId, role: 'BUYER_BROKER' as const });
    
    await db.insert(contractParties).values(partyInserts);

    // 5. Insert Contract Line Item (Phase 1 legacy support only assumes 1 line per sauda)
    const weightRaw = formData.get("weight") as string;
    const rateRaw = formData.get("rate") as string;
    
    const weight = weightRaw ? parseFloat(weightRaw) : 0;
    const rate = rateRaw ? parseFloat(rateRaw) : 0;
    const amount = weight * rate;

    await db.insert(contractLines).values({
      contractId,
      commodityId,
      packagingId,
      brand: (formData.get("brand") as string) || null,
      weightQuintals: weight.toString(),
      rate: rate.toString(),
      amount: amount.toString(),
    });

  } catch (err: any) {
    console.error("Failed to sequence contract creation:", err);
    return;
  }
  
  revalidatePath('/contracts');
  revalidatePath('/');
  redirect('/contracts');
}

export async function updateContract(contractId: number, formData: FormData): Promise<void> {
  try {
    const saudaNoRaw = formData.get("saudaNo") as string;
    if (!saudaNoRaw) throw new Error("Sauda No is required");
    const saudaNo = parseInt(saudaNoRaw, 10);

    const saudaBook = (formData.get("saudaBook") as string) || "Main Book";
    const saudaDateStr = formData.get("saudaDate") as string;
    const saudaDate = saudaDateStr ? new Date(saudaDateStr) : new Date();
    const deliveryTerm = formData.get("deliveryTerm") as string;

    const commodityName = formData.get("commodity") as string;
    if (!commodityName) throw new Error("Commodity is required");
    const commodityId = await getOrCreateCommodity(commodityName);

    const packagingName = formData.get("packaging") as string;
    const packagingId = await getOrCreatePackaging(commodityId, packagingName);

    const sellerId = await getOrCreateParty(formData.get("sellerName") as string);
    const buyerId = await getOrCreateParty(formData.get("buyerName") as string);
    const sellerBrokerId = await getOrCreateParty(formData.get("sellerBroker") as string);
    const buyerBrokerId = await getOrCreateParty(formData.get("buyerBroker") as string);

    if (!sellerId || !buyerId) throw new Error("Seller and Buyer are required");

    const weightRaw = formData.get("weight") as string;
    const rateRaw = formData.get("rate") as string;
    const newWeight = weightRaw ? parseFloat(weightRaw) : 0;
    const newRate = rateRaw ? parseFloat(rateRaw) : 0;

    await db.transaction(async (tx) => {
      // 1. Update Base Contract
      await tx.update(contracts).set({
        saudaNo,
        saudaBook,
        saudaDate,
        deliveryTerm: deliveryTerm || null,
        customRemarks: (formData.get("remarks") as string) || null,
        updatedAt: new Date(),
      }).where(eq(contracts.id, contractId));

      // 2. Wipe & Rewrite Contract Parties
      await tx.delete(contractParties).where(eq(contractParties.contractId, contractId));
      
      const partyInserts = [];
      partyInserts.push({ contractId, partyId: sellerId, role: 'SELLER' as const });
      partyInserts.push({ contractId, partyId: buyerId, role: 'BUYER' as const });
      if (sellerBrokerId) partyInserts.push({ contractId, partyId: sellerBrokerId, role: 'SELLER_BROKER' as const });
      if (buyerBrokerId && buyerBrokerId !== sellerBrokerId) partyInserts.push({ contractId, partyId: buyerBrokerId, role: 'BUYER_BROKER' as const });
      
      await tx.insert(contractParties).values(partyInserts);

      // 3. Update Contract Line
      const amount = newWeight * newRate;

      await tx.delete(contractLines).where(eq(contractLines.contractId, contractId));
      await tx.insert(contractLines).values({
        contractId,
        commodityId,
        packagingId,
        brand: (formData.get("brand") as string) || null,
        weightQuintals: newWeight.toString(),
        rate: newRate.toString(),
        amount: amount.toString(),
      });
    });

  } catch (err: any) {
    console.error("Failed to update contract:", err);
    return;
  }
  
  revalidatePath('/contracts');
  revalidatePath('/');
  redirect('/contracts');
}
