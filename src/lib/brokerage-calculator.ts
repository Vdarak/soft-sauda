/**
 * Brokerage Calculator Engine (Phase 3)
 *
 * Replicates SQL Server procedure `SP_RecalculateBrok`.
 * Computes buyer and seller brokerage based on:
 *   1. Custom Party x Commodity Packing override (`party_item_brokerage` / `prtitemstp`)
 *   2. Commodity Packaging defaults (`commodity_packaging` / `itemstp`)
 *   3. Rate basis calculation: PER_QUINTAL, PER_BAG, or PERCENTAGE
 */

import { db } from '@/db';
import { partyItemBrokerage, commodityPackaging } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export interface BrokerageCalculationInput {
  partyId?: number;
  commodityId: number;
  packagingId?: number;
  packWeight?: number;
  quantityBags?: number;
  weightQuintals: number;
  rate: number;
}

export interface BrokerageResult {
  sellerRate: number;
  sellerType: string;
  sellerAmount: number;
  buyerRate: number;
  buyerType: string;
  buyerAmount: number;
}

export async function calculateBrokerage(input: BrokerageCalculationInput): Promise<BrokerageResult> {
  const {
    partyId,
    commodityId,
    packagingId,
    packWeight = 50,
    quantityBags = 0,
    weightQuintals,
    rate,
  } = input;

  let sellerRate = 0;
  let sellerType = 'PMT'; // PMT (Per Metric Ton/Quintal), BAG, PCT
  let buyerRate = 0;
  let buyerType = 'PMT';

  // 1. Check Party x Item override
  if (partyId) {
    const partyOverride = await db.select()
      .from(partyItemBrokerage)
      .where(
        and(
          eq(partyItemBrokerage.partyId, partyId),
          eq(partyItemBrokerage.commodityId, commodityId)
        )
      )
      .limit(1);

    if (partyOverride.length > 0) {
      const p = partyOverride[0];
      sellerRate = parseFloat(p.sellerBrokerageRate || '0');
      sellerType = p.sellerBrokerageType || 'PMT';
      buyerRate = parseFloat(p.buyerBrokerageRate || '0');
      buyerType = p.buyerBrokerageType || 'PMT';
    }
  }

  // 2. If no party override found, fallback to Commodity Packaging default
  if (sellerRate === 0 && buyerRate === 0 && packagingId) {
    const defaultPkg = await db.select()
      .from(commodityPackaging)
      .where(eq(commodityPackaging.id, packagingId))
      .limit(1);

    if (defaultPkg.length > 0) {
      const pkg = defaultPkg[0];
      sellerRate = parseFloat(pkg.sellerBrokerageRate || '0');
      sellerType = pkg.sellerBrokerageType || 'PMT';
      buyerRate = parseFloat(pkg.buyerBrokerageRate || '0');
      buyerType = pkg.buyerBrokerageType || 'PMT';
    }
  }

  // Helper calculation function
  const computeAmount = (brkRate: number, brkType: string): number => {
    if (brkRate === 0) return 0;
    const typeUpper = brkType.toUpperCase();

    if (typeUpper === 'BAG' || typeUpper === 'PER_BAG') {
      return (quantityBags || (weightQuintals * 100 / (packWeight || 50))) * brkRate;
    }
    if (typeUpper === 'PCT' || typeUpper === 'PERCENT' || typeUpper === '%') {
      const grossAmount = weightQuintals * rate;
      return (grossAmount * brkRate) / 100;
    }
    // Default: PMT / PER_QUINTAL
    return weightQuintals * brkRate;
  };

  const sellerAmount = Math.round(computeAmount(sellerRate, sellerType) * 100) / 100;
  const buyerAmount = Math.round(computeAmount(buyerRate, buyerType) * 100) / 100;

  return {
    sellerRate,
    sellerType,
    sellerAmount,
    buyerRate,
    buyerType,
    buyerAmount,
  };
}
