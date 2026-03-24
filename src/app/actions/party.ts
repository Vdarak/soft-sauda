'use server'

import { db } from '@/db';
import { parties } from '@/db/schema';
import { revalidatePath } from 'next/cache';

export async function createParty(formData: FormData): Promise<void> {
  try {
    const name = formData.get("name") as string;
    if (!name) {
       console.error("Party Name is required");
       return;
    }

    await db.insert(parties).values({
       name,
       gstin: (formData.get("gstin") as string) || null,
       tin: (formData.get("tin") as string) || null,
       cst: (formData.get("cst") as string) || null,
       broker: (formData.get("broker") as string) || null,
       phone: (formData.get("phone") as string) || null,
       address: (formData.get("address") as string) || null,
    });

    revalidatePath('/parties');
    revalidatePath('/'); // Also affects autocomplete on contracts page
  } catch (err: any) {
    console.error("Failed to create party:", err);
  }
}
