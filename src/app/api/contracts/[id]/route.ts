/**
 * GET /api/contracts/:id — Get single contract with all relations
 * PUT /api/contracts/:id — Update contract (wipe & rewrite parties/lines)
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { contracts, contractParties, contractLines, parties, commodities, commodityPackaging } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { ok, badRequest, notFound, serverError, parseBody } from '@/lib/api-helpers';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/cache';

type Params = { params: Promise<{ id: string }> };

/** Resolve or create a party by name */
async function resolveParty(name: string | null | undefined, tx: any): Promise<number | null> {
  if (!name?.trim()) return null;
  const clean = name.trim();
  const existing = await tx.select({ id: parties.id }).from(parties).where(eq(parties.name, clean)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const [inserted] = await tx.insert(parties).values({ name: clean }).returning({ id: parties.id });
  return inserted.id;
}

async function resolveCommodity(name: string, tx: any): Promise<number> {
  const clean = name.trim();
  const existing = await tx.select({ id: commodities.id }).from(commodities).where(eq(commodities.name, clean)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const [inserted] = await tx.insert(commodities).values({ name: clean }).returning({ id: commodities.id });
  return inserted.id;
}

async function resolvePackaging(commodityId: number, packName: string | null | undefined, tx: any): Promise<number | null> {
  if (!packName?.trim()) return null;
  const clean = packName.trim();
  const existing = await tx.select({ id: commodityPackaging.id }).from(commodityPackaging)
    .where(and(eq(commodityPackaging.commodityId, commodityId), eq(commodityPackaging.packingType, clean))).limit(1);
  if (existing.length > 0) return existing[0].id;
  const [inserted] = await tx.insert(commodityPackaging).values({ commodityId, packingType: clean, packingWeight: '0' }).returning({ id: commodityPackaging.id });
  return inserted.id;
}

export async function GET(req: NextRequest, context: Params) {
  try {
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid contract ID');

    const cacheKey = `contracts:${id}`;
    const cached = cacheGet(cacheKey);
    if (cached) return ok(cached);

    const contract = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
    if (contract.length === 0) return notFound('Contract not found');

    const partiesRows = await db.select({ role: contractParties.role, name: parties.name, partyId: contractParties.partyId })
      .from(contractParties)
      .leftJoin(parties, eq(contractParties.partyId, parties.id))
      .where(eq(contractParties.contractId, id));

    const lines = await db.select().from(contractLines).where(eq(contractLines.contractId, id));

    // Enrich lines with commodity names
    const enrichedLines = [];
    for (const line of lines) {
      const comm = await db.select({ name: commodities.name }).from(commodities).where(eq(commodities.id, line.commodityId)).limit(1);
      enrichedLines.push({ ...line, commodityName: comm[0]?.name || 'Unknown' });
    }

    const result = {
      ...contract[0],
      parties: partiesRows,
      lines: enrichedLines,
      sellerName: partiesRows.find(p => p.role === 'SELLER')?.name || null,
      buyerName: partiesRows.find(p => p.role === 'BUYER')?.name || null,
      sellerBroker: partiesRows.find(p => p.role === 'SELLER_BROKER')?.name || null,
      buyerBroker: partiesRows.find(p => p.role === 'BUYER_BROKER')?.name || null,
    };

    cacheSet(cacheKey, result, 120);
    return ok(result);
  } catch (err) {
    console.error('GET /api/contracts/[id] error:', err);
    return serverError('Failed to fetch contract');
  }
}

export async function PUT(req: NextRequest, context: Params) {
  try {
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid contract ID');

    const body = await parseBody<Record<string, any>>(req);
    if (!body) return badRequest('Request body is required');

    await db.transaction(async (tx) => {
      await tx.update(contracts).set({
        saudaNo: parseInt(body.saudaNo, 10),
        saudaBook: body.saudaBook || 'Main Book',
        saudaDate: body.saudaDate ? new Date(body.saudaDate) : new Date(),
        deliveryTerm: body.deliveryTerm || null,
        customRemarks: body.remarks || null,
        updatedAt: new Date(),
      }).where(eq(contracts.id, id));

      // Wipe & rewrite parties
      await tx.delete(contractParties).where(eq(contractParties.contractId, id));
      const sellerId = await resolveParty(body.sellerName, tx);
      const buyerId = await resolveParty(body.buyerName, tx);
      const sellerBrokerId = await resolveParty(body.sellerBroker, tx);
      const buyerBrokerId = await resolveParty(body.buyerBroker, tx);

      const partyInserts: any[] = [];
      if (sellerId) partyInserts.push({ contractId: id, partyId: sellerId, role: 'SELLER' as const });
      if (buyerId) partyInserts.push({ contractId: id, partyId: buyerId, role: 'BUYER' as const });
      if (sellerBrokerId) partyInserts.push({ contractId: id, partyId: sellerBrokerId, role: 'SELLER_BROKER' as const });
      if (buyerBrokerId && buyerBrokerId !== sellerBrokerId) partyInserts.push({ contractId: id, partyId: buyerBrokerId, role: 'BUYER_BROKER' as const });
      if (partyInserts.length > 0) await tx.insert(contractParties).values(partyInserts);

      // Wipe & rewrite contract line
      await tx.delete(contractLines).where(eq(contractLines.contractId, id));
      const commodityId = await resolveCommodity(body.commodity || 'Unknown', tx);
      const packagingId = await resolvePackaging(commodityId, body.packaging, tx);
      const weight = parseFloat(body.weight || '0');
      const rate = parseFloat(body.rate || '0');

      await tx.insert(contractLines).values({
        contractId: id,
        commodityId,
        packagingId,
        brand: body.brand || null,
        weightQuintals: weight.toString(),
        rate: rate.toString(),
        amount: (weight * rate).toString(),
      });
    });

    cacheInvalidate('contracts');
    const updated = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
    return ok(updated[0]);
  } catch (err) {
    console.error('PUT /api/contracts/[id] error:', err);
    return serverError('Failed to update contract');
  }
}

export async function DELETE(req: NextRequest, context: Params) {
  try {
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid ID');
    await db.delete(contracts).where(eq(contracts.id, id));
    cacheInvalidate('contracts');
    return ok({ success: true, id });
  } catch (err) {
    console.error('DELETE /api/contracts/[id] error:', err);
    return serverError('Failed to delete');
  }
}
