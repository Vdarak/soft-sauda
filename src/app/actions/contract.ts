'use server'

import { db } from '@/db';
import { contracts } from '@/db/schema';
import { revalidatePath } from 'next/cache';

export async function createContract(formData: FormData): Promise<void> {
  try {
    // Identifiers
    const saudaNo = parseInt(formData.get("saudaNo") as string, 10);
    const saudaBook = formData.get("saudaBook") as string;
    const saudaDate = formData.get("saudaDate") as string;

    // Seller
    const sellerName = formData.get("sellerName") as string;
    const sellerGstin = formData.get("sellerGstin") as string;
    const sellerTin = formData.get("sellerTin") as string;
    const sellerCst = formData.get("sellerCst") as string;
    const sellerBroker = formData.get("sellerBroker") as string;

    // Buyer
    const buyerName = formData.get("buyerName") as string;
    const buyerGstin = formData.get("buyerGstin") as string;
    const buyerTin = formData.get("buyerTin") as string;
    const buyerCst = formData.get("buyerCst") as string;
    const buyerBroker = formData.get("buyerBroker") as string;

    // Trade Details
    const commodity = formData.get("commodity") as string;
    const brand = formData.get("brand") as string;
    const packaging = formData.get("packaging") as string;
    const r_weight = formData.get("weight") as string;
    const r_rate = formData.get("rate") as string;

    // Terms
    const deliveryTerm = formData.get("deliveryTerm") as string;
    const validFrom = formData.get("validFrom") as string;
    const validTo = formData.get("validTo") as string;
    const cForm = formData.get("cForm") as string;

    if (!saudaNo || !sellerName || !buyerName || !commodity) {
      console.error("Missing required fields (Sauda No, Seller, Buyer, Commodity)");
      return;
    }

    const rate = r_rate ? parseFloat(r_rate) : 0;
    const weight = r_weight ? parseFloat(r_weight) : 0;
    const amount = rate * weight;

    await db.insert(contracts).values({
      saudaNo,
      saudaBook: saudaBook || null,
      saudaDate: saudaDate || undefined, // If empty, Drizzle will use DB default
      
      sellerName,
      sellerGstin: sellerGstin || null,
      sellerTin: sellerTin || null,
      sellerCst: sellerCst || null,
      sellerBroker: sellerBroker || null,

      buyerName,
      buyerGstin: buyerGstin || null,
      buyerTin: buyerTin || null,
      buyerCst: buyerCst || null,
      buyerBroker: buyerBroker || null,

      commodity,
      brand: brand || null,
      packaging: packaging || null,
      weight,
      rate,
      amount,

      deliveryTerm: deliveryTerm || null,
      validFrom: validFrom || null,
      validTo: validTo || null,
      cForm: cForm || null,
    });

    revalidatePath('/');
  } catch (err: any) {
    console.error("Failed to create contract:", err);
  }
}
