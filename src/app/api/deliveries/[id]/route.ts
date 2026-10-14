/**
 * GET /api/deliveries/:id — Get delivery with lines (company+FY scoped)
 * PUT /api/deliveries/:id — Update delivery
 * DELETE /api/deliveries/:id — Delete delivery
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { deliveries, deliveryLines, deliveryCharges, parties, contractLines, contracts, commodities, contractParties, users } from '@/db/schema';
import { eq, and, aliasedTable } from 'drizzle-orm';
import { ok, badRequest, notFound, serverError, parseBody, unauthorized } from '@/lib/api-helpers';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/cache';
import { triggerBackgroundWarmup } from '@/lib/warmup';
import { getRequestContext, stripAuditFields, writeAuditLog } from '@/lib/middleware';
import { updateContractExecutionBalances } from '@/lib/contract-execution';

type Params = { params: Promise<{ id: string }> };

async function resolveParty(name: string | null | undefined, tx?: any): Promise<number | null> {
  if (!name?.trim()) return null;
  const clean = name.trim();
  const dbCtx = tx || db;
  const existing = await dbCtx.select({ id: parties.id }).from(parties).where(eq(parties.name, clean)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const [inserted] = await dbCtx.insert(parties).values({ name: clean }).returning({ id: parties.id });
  return inserted.id;
}

export async function GET(req: NextRequest, context: Params) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId, role } = ctx;
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid delivery ID');

    const cacheKey = `deliveries:${id}`;
    const cached = cacheGet(cacheKey);
    if (cached) return ok(stripAuditFields(cached, role));

    const creator = aliasedTable(users, 'creator');
    const updater = aliasedTable(users, 'updater');

    const deliveryRows = await db.select({
      delivery: deliveries,
      createdByUsername: creator.username,
      createdByDisplayName: creator.displayName,
      updatedByUsername: updater.username,
      updatedByDisplayName: updater.displayName,
    })
      .from(deliveries)
      .leftJoin(creator, eq(deliveries.createdBy, creator.id))
      .leftJoin(updater, eq(deliveries.updatedBy, updater.id))
      .where(and(eq(deliveries.id, id), eq(deliveries.companyId, companyId), eq(deliveries.fiscalYearId, fiscalYearId)))
      .limit(1);

    if (deliveryRows.length === 0) return notFound('Delivery not found');

    const deliveryData = deliveryRows[0].delivery;

    const lines = await db.select().from(deliveryLines).where(eq(deliveryLines.deliveryId, id));
    const charges = await db.select().from(deliveryCharges).where(eq(deliveryCharges.deliveryId, id));

    const enrichedLines = [];
    let saudaNo = null;
    let saudaDate = null;
    let contractId = null;

    for (const line of lines) {
      const clRow = await db.select({ contractId: contractLines.contractId, commodityId: contractLines.commodityId, rate: contractLines.rate })
        .from(contractLines).where(eq(contractLines.id, line.contractLineId)).limit(1);
      if (clRow.length > 0) {
        contractId = clRow[0].contractId;
        const cRow = await db.select({ saudaNo: contracts.saudaNo, saudaDate: contracts.saudaDate })
          .from(contracts).where(eq(contracts.id, contractId)).limit(1);
        if (cRow.length > 0) {
          saudaNo = cRow[0].saudaNo;
          saudaDate = cRow[0].saudaDate;
        }
        const comm = await db.select({ name: commodities.name }).from(commodities).where(eq(commodities.id, clRow[0].commodityId)).limit(1);
        enrichedLines.push({
          ...line,
          commodityName: comm[0]?.name || 'Unknown',
          rate: clRow[0].rate,
          saudaNo,
          saudaDate,
        });
      } else {
        enrichedLines.push(line);
      }
    }

    let transporterName = null;
    if (deliveryData.transporterId) {
      const t = await db.select({ name: parties.name }).from(parties).where(eq(parties.id, deliveryData.transporterId)).limit(1);
      transporterName = t[0]?.name || null;
    }

    const targetContractId = contractId || id;
    const pRows = await db.select({ role: contractParties.role, name: parties.name })
      .from(contractParties)
      .leftJoin(parties, eq(parties.id, contractParties.partyId))
      .where(eq(contractParties.contractId, targetContractId));

    const sellerName = pRows.find(p => p.role === 'SELLER')?.name || null;
    const buyerName = pRows.find(p => p.role === 'BUYER')?.name || null;
    const sellerBroker = pRows.find(p => p.role === 'SELLER_BROKER')?.name || null;
    const buyerBroker = pRows.find(p => p.role === 'BUYER_BROKER')?.name || null;

    const result = {
      ...deliveryData,
      transporterName,
      billNo: deliveryData.billNo,
      lines: enrichedLines,
      charges,
      saudaNo,
      saudaDate,
      contractId,
      sellerName,
      buyerName,
      sellerBroker,
      buyerBroker,
      createdByUsername: deliveryRows[0].createdByUsername,
      createdByDisplayName: deliveryRows[0].createdByDisplayName,
      updatedByUsername: deliveryRows[0].updatedByUsername,
      updatedByDisplayName: deliveryRows[0].updatedByDisplayName,
    };
    cacheSet(cacheKey, result, 120);
    return ok(stripAuditFields(result, role));
  } catch (err) {
    console.error('GET /api/deliveries/[id] error:', err);
    return serverError('Failed to fetch delivery');
  }
}

export async function PUT(req: NextRequest, context: Params) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId, userId, role } = ctx;
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid delivery ID');

    const body = await parseBody<Record<string, any>>(req);
    if (!body) return badRequest('Request body is required');

    // Verify ownership/scoping before update
    const existingDelivery = await db.select().from(deliveries)
      .where(and(eq(deliveries.id, id), eq(deliveries.companyId, companyId), eq(deliveries.fiscalYearId, fiscalYearId)))
      .limit(1);
    if (existingDelivery.length === 0) return notFound('Delivery not found or does not belong to active company/fiscal year');

    const affectedLineIds = new Set<number>();

    await db.transaction(async (tx) => {
      // 1. Collect old contractLineIds before replacement
      const oldLines = await tx.select({ contractLineId: deliveryLines.contractLineId })
        .from(deliveryLines)
        .where(eq(deliveryLines.deliveryId, id));
      oldLines.forEach(l => { if (l.contractLineId) affectedLineIds.add(l.contractLineId); });

      const transporterId = await resolveParty(body.transporterName, tx);

      await tx.update(deliveries).set({
        dispatchDate: body.dispatchDate ? new Date(body.dispatchDate) : new Date(),
        truckNo: body.truckNo || null,
        billNo: body.billNo || null,
        carrierBillDate: body.carrierBillDate ? new Date(body.carrierBillDate) : null,
        transporterId,
        advancePaymentCollected: body.advancePaymentCollected ? parseFloat(body.advancePaymentCollected).toString() : null,
        status: body.status || 'DISPATCHED',
        updatedAt: new Date(),
        updatedBy: userId,
      }).where(eq(deliveries.id, id));

      await tx.delete(deliveryLines).where(eq(deliveryLines.deliveryId, id));
      await tx.delete(deliveryCharges).where(eq(deliveryCharges.deliveryId, id));

      const lines = body.lines && Array.isArray(body.lines) ? body.lines : [];
      if (lines.length > 0) {
        for (const line of lines) {
          if (!line.contractLineId || !line.dispatchedWeight) continue;
          const cLineId = parseInt(line.contractLineId, 10);
          await tx.insert(deliveryLines).values({
            deliveryId: id,
            contractLineId: cLineId,
            dispatchedBags: line.dispatchedBags ? parseFloat(line.dispatchedBags).toString() : null,
            dispatchedWeight: parseFloat(line.dispatchedWeight).toString(),
          });
          affectedLineIds.add(cLineId);
        }
      } else if (body.contractLineId && body.dispatchedWeight) {
        const cLineId = parseInt(body.contractLineId, 10);
        await tx.insert(deliveryLines).values({
          deliveryId: id,
          contractLineId: cLineId,
          dispatchedBags: body.dispatchedBags ? parseFloat(body.dispatchedBags).toString() : null,
          dispatchedWeight: parseFloat(body.dispatchedWeight).toString(),
        });
        affectedLineIds.add(cLineId);
      }

      const charges = body.charges && Array.isArray(body.charges) ? body.charges : [];
      for (const charge of charges) {
        if (!charge.chargeType || charge.amount === undefined || charge.amount === null) continue;
        const amtVal = parseFloat(charge.amount || '0');
        await tx.insert(deliveryCharges).values({
          deliveryId: id,
          chargeType: charge.chargeType,
          amount: amtVal.toString(),
        });
      }

      // Recompute parent contract balances (replicating SP_sauda2rear)
      if (affectedLineIds.size > 0) {
        await updateContractExecutionBalances(Array.from(affectedLineIds), tx);
      }
    });

    writeAuditLog({
      userId,
      companyId,
      action: 'UPDATE',
      entityType: 'delivery',
      entityId: id,
      changes: { truckNo: body.truckNo, status: body.status || 'DISPATCHED' },
    });

    cacheInvalidate('deliveries');
    cacheInvalidate(`deliveries:${id}`);
    cacheInvalidate('contracts');
    cacheInvalidate('dashboard');
    triggerBackgroundWarmup(companyId, fiscalYearId);
    const updated = await db.select().from(deliveries).where(eq(deliveries.id, id)).limit(1);
    return ok(stripAuditFields(updated[0], role));
  } catch (err) {
    console.error('PUT /api/deliveries/[id] error:', err);
    return serverError('Failed to update delivery');
  }
}

export async function DELETE(req: NextRequest, context: Params) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId, userId } = ctx;
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid ID');

    // Verify ownership/scoping before delete
    const existingDelivery = await db.select().from(deliveries)
      .where(and(eq(deliveries.id, id), eq(deliveries.companyId, companyId), eq(deliveries.fiscalYearId, fiscalYearId)))
      .limit(1);
    if (existingDelivery.length === 0) return notFound('Delivery not found or does not belong to active company/fiscal year');

    // Collect affected contract line IDs before deletion
    const oldLines = await db.select({ contractLineId: deliveryLines.contractLineId })
      .from(deliveryLines)
      .where(eq(deliveryLines.deliveryId, id));
    const affectedLineIds = oldLines.map(l => l.contractLineId).filter(Boolean) as number[];

    await db.delete(deliveries).where(eq(deliveries.id, id));

    // Recompute parent contract balances
    if (affectedLineIds.length > 0) {
      await updateContractExecutionBalances(affectedLineIds);
    }

    writeAuditLog({
      userId,
      companyId,
      action: 'DELETE',
      entityType: 'delivery',
      entityId: id,
    });

    cacheInvalidate('deliveries');
    cacheInvalidate(`deliveries:${id}`);
    cacheInvalidate('contracts');
    cacheInvalidate('dashboard');
    triggerBackgroundWarmup(companyId, fiscalYearId);
    return ok({ success: true, id });
  } catch (err: any) {
    console.error('DELETE /api/deliveries/[id] error:', err);
    if (err.code === '23503') {
      return badRequest('Cannot delete delivery: it has associated bills. Please delete the bills first.');
    }
    return serverError('Failed to delete');
  }
}
