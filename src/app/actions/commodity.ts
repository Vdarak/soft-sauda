'use server'

import { db } from '@/db';
import { commodities, commodityPackaging, commoditySpecifications } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';

export async function createCommodity(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const shortName = formData.get("shortName") as string;
    const description = formData.get("description") as string;
    const hsnCode = formData.get("hsnCode") as string;
    const unit = formData.get("unit") as string;
    
    // Parse the embedded hidden JSON strings for the nested grids
    const packagingRaw = formData.get("packagingList") as string;
    const specsRaw = formData.get("specificationsList") as string;

    const packagingList = packagingRaw ? JSON.parse(packagingRaw) : [];
    const specsList = specsRaw ? JSON.parse(specsRaw) : [];

    if (!name) return;

    await db.transaction(async (tx) => {
      // 1. Insert Master Commodity Header
      const [insertedComm] = await tx.insert(commodities).values({
        name,
        description: description || null,
        shortName: shortName || null,
        hsnCode: hsnCode || null,
        unit: unit || null,
      }).returning({ id: commodities.id });

      const newCommId = insertedComm.id;

      // 2. Insert Packaging Grid
      if (packagingList.length > 0) {
        const packInserts = packagingList.map((p: any) => ({
          commodityId: newCommId,
          packingWeight: p.packingWeight.toString(),
          packingType: p.packingType,
          sellerBrokerageRate: p.sellerBrokerageRate ? p.sellerBrokerageRate.toString() : null,
          sellerBrokerageType: p.sellerBrokerageType || null,
          buyerBrokerageRate: p.buyerBrokerageRate ? p.buyerBrokerageRate.toString() : null,
          buyerBrokerageType: p.buyerBrokerageType || null,
        }));
        await tx.insert(commodityPackaging).values(packInserts);
      }

      // 3. Insert Specifications Grid
      if (specsList.length > 0) {
        const specInserts = specsList.map((s: any) => ({
          commodityId: newCommId,
          specification: s.specification,
          specValue: s.specValue ? s.specValue.toString() : null,
          minMax: s.minMax || null,
          remarks: s.remarks || null,
        }));
        await tx.insert(commoditySpecifications).values(specInserts);
      }
    });
    
    revalidatePath('/commodities');
  } catch (err: any) {
    console.error("Failed to create complex commodity:", err);
    throw err;
  }

  redirect('/commodities');
}

export async function updateCommodity(id: number, formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const shortName = formData.get("shortName") as string;
    const description = formData.get("description") as string;
    const hsnCode = formData.get("hsnCode") as string;
    const unit = formData.get("unit") as string;
    
    // Parse the embedded hidden JSON strings for the nested grids
    const packagingRaw = formData.get("packagingList") as string;
    const specsRaw = formData.get("specificationsList") as string;

    const packagingList = packagingRaw ? JSON.parse(packagingRaw) : [];
    const specsList = specsRaw ? JSON.parse(specsRaw) : [];

    if (!name) return;

    await db.transaction(async (tx) => {
      // 1. Update Master Header
      await tx.update(commodities).set({
        name,
        description: description || null,
        shortName: shortName || null,
        hsnCode: hsnCode || null,
        unit: unit || null,
      }).where(eq(commodities.id, id));

      // 2. Wipe & Rewrite Packages
      await tx.delete(commodityPackaging).where(eq(commodityPackaging.commodityId, id));
      if (packagingList.length > 0) {
        const packInserts = packagingList.map((p: any) => ({
          commodityId: id,
          packingWeight: p.packingWeight.toString(),
          packingType: p.packingType,
          sellerBrokerageRate: p.sellerBrokerageRate ? p.sellerBrokerageRate.toString() : null,
          sellerBrokerageType: p.sellerBrokerageType || null,
          buyerBrokerageRate: p.buyerBrokerageRate ? p.buyerBrokerageRate.toString() : null,
          buyerBrokerageType: p.buyerBrokerageType || null,
        }));
        await tx.insert(commodityPackaging).values(packInserts);
      }

      // 3. Wipe & Rewrite Specs
      await tx.delete(commoditySpecifications).where(eq(commoditySpecifications.commodityId, id));
      if (specsList.length > 0) {
        const specInserts = specsList.map((s: any) => ({
          commodityId: id,
          specification: s.specification,
          specValue: s.specValue ? s.specValue.toString() : null,
          minMax: s.minMax || null,
          remarks: s.remarks || null,
        }));
        await tx.insert(commoditySpecifications).values(specInserts);
      }
    });
    
    revalidatePath('/commodities');
  } catch (err: any) {
    console.error("Failed to update complex commodity:", err);
    throw err;
  }

  redirect('/commodities');
}
