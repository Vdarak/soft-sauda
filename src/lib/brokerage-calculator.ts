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
  let overrideFound = false;

  // 1. Check Party x Item override (Hierarchical evaluation)
  if (partyId) {
    const partyOverrides = await db.select()
      .from(partyItemBrokerage)
      .where(eq(partyItemBrokerage.partyId, partyId));

    if (partyOverrides.length > 0) {
      // Sort / match by specificity:
      // Priority 1: Match commodity + Match packing weight
      // Priority 2: Match commodity + Global packing (null or 0)
      // Priority 3: Global commodity (null) + Match packing weight
      // Priority 4: Global commodity (null) + Global packing (null or 0)
      const matched = partyOverrides.find((p) =>
        p.commodityId === commodityId &&
        p.packingWeight && Math.abs(parseFloat(p.packingWeight) - packWeight) < 0.01
      ) || partyOverrides.find((p) =>
        p.commodityId === commodityId &&
        (!p.packingWeight || parseFloat(p.packingWeight) === 0)
      ) || partyOverrides.find((p) =>
        !p.commodityId &&
        p.packingWeight && Math.abs(parseFloat(p.packingWeight) - packWeight) < 0.01
      ) || partyOverrides.find((p) =>
        !p.commodityId &&
        (!p.packingWeight || parseFloat(p.packingWeight) === 0)
      );

      if (matched) {
        sellerRate = parseFloat(matched.sellerBrokerageRate || '0');
        sellerType = matched.sellerBrokerageType || 'PMT';
        buyerRate = parseFloat(matched.buyerBrokerageRate || '0');
        buyerType = matched.buyerBrokerageType || 'PMT';
        overrideFound = true;
      }
    }
  }

  // 2. Fallback to Commodity Packaging default if no party override exists
  if (!overrideFound && packagingId) {
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
