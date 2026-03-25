'use server'

import { db } from '@/db';
import { parties, partyTaxIds, taxIdTypeEnum } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';

export async function createParty(formData: FormData): Promise<void> {
  try {
    const name = formData.get("name") as string;
    if (!name) return;

    const creditLimitRaw = formData.get("creditLimit") as string;
    const creditLimit = creditLimitRaw ? creditLimitRaw : null;

    // 1. Insert Base Party Entity
    const inserted = await db.insert(parties).values({
       name,
       address: (formData.get("address") as string) || null,
       landmark: (formData.get("landmark") as string) || null,
       place: (formData.get("place") as string) || null,
       stateName: (formData.get("stateName") as string) || null,
       pinCode: (formData.get("pinCode") as string) || null,
       creditLimit,
       phone: (formData.get("phone") as string) || null,
       smsMobile: (formData.get("smsMobile") as string) || null,
       mill: (formData.get("mill") as string) || null,
       fax: (formData.get("fax") as string) || null,
       emailIds: (formData.get("emailIds") as string) || null,
       designation: (formData.get("designation") as string) || null,
    }).returning({ id: parties.id });

    const partyId = inserted[0].id;

    // 2. Insert mapped Tax IDs if present
    const gstin = formData.get("gstin") as string;
    if (gstin) await db.insert(partyTaxIds).values({ partyId, taxType: 'GSTIN', taxValue: gstin });
    
    const vatTin = formData.get("vatTin") as string;
    if (vatTin) await db.insert(partyTaxIds).values({ partyId, taxType: 'VAT_TIN', taxValue: vatTin });

    const cstTin = formData.get("cstTin") as string;
    if (cstTin) await db.insert(partyTaxIds).values({ partyId, taxType: 'CST_TIN', taxValue: cstTin });

    const cstNo = formData.get("cstNo") as string;
    if (cstNo) await db.insert(partyTaxIds).values({ partyId, taxType: 'CST_NO', taxValue: cstNo });

  } catch (err: any) {
    console.error("Failed to create party:", err);
    return;
  }
  
  revalidatePath('/parties');
  redirect('/parties');
}

export async function updateParty(id: number, formData: FormData): Promise<void> {
  try {
    const name = formData.get("name") as string;
    if (!name) return;

    const creditLimitRaw = formData.get("creditLimit") as string;
    const creditLimit = creditLimitRaw ? creditLimitRaw : null;
    const isActive = formData.get("isActive") === "true";

    await db.transaction(async (tx) => {
      // 1. Update Base Party Entity
      await tx.update(parties).set({
         name,
         address: (formData.get("address") as string) || null,
         landmark: (formData.get("landmark") as string) || null,
         place: (formData.get("place") as string) || null,
         stateName: (formData.get("stateName") as string) || null,
         pinCode: (formData.get("pinCode") as string) || null,
         creditLimit,
         phone: (formData.get("phone") as string) || null,
         smsMobile: (formData.get("smsMobile") as string) || null,
         mill: (formData.get("mill") as string) || null,
         fax: (formData.get("fax") as string) || null,
         emailIds: (formData.get("emailIds") as string) || null,
         designation: (formData.get("designation") as string) || null,
         isActive,
         updatedAt: new Date(),
      }).where(eq(parties.id, id));

      // 2. Clear and rewrite matching Tax IDs
      await tx.delete(partyTaxIds).where(eq(partyTaxIds.partyId, id));

      const gstin = formData.get("gstin") as string;
      if (gstin) await tx.insert(partyTaxIds).values({ partyId: id, taxType: 'GSTIN', taxValue: gstin });
      
      const vatTin = formData.get("vatTin") as string;
      if (vatTin) await tx.insert(partyTaxIds).values({ partyId: id, taxType: 'VAT_TIN', taxValue: vatTin });

      const cstTin = formData.get("cstTin") as string;
      if (cstTin) await tx.insert(partyTaxIds).values({ partyId: id, taxType: 'CST_TIN', taxValue: cstTin });

      const cstNo = formData.get("cstNo") as string;
      if (cstNo) await tx.insert(partyTaxIds).values({ partyId: id, taxType: 'CST_NO', taxValue: cstNo });
    });

  } catch (err: any) {
    console.error("Failed to update party:", err);
    return;
  }
  
  revalidatePath('/parties');
  redirect('/parties');
}
