/**
 * GET /api/deliveries/:id — Get delivery with lines
 * PUT /api/deliveries/:id — Update delivery
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { deliveries, deliveryLines, deliveryCharges, parties, contractLines, contracts, commodities } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, badRequest, notFound, serverError, parseBody } from '@/lib/api-helpers';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/cache';

type Params = { params: Promise<{ id: string }> };

async function resolveParty(name: string | null | undefined): Promise<number | null> {
  if (!name?.trim()) return null;
  const clean = name.trim();
  const existing = await db.select({ id: parties.id }).from(parties).where(eq(parties.name, clean)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const [inserted] = await db.insert(parties).values({ name: clean }).returning({ id: parties.id });
  return inserted.id;
}

export async function GET(req: NextRequest, context: Params) {
  try {
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid delivery ID');

    const cacheKey = `deliveries:${id}`;
    const cached = cacheGet(cacheKey);
    if (cached) return ok(cached);

    const delivery = await db.select().from(deliveries).where(eq(deliveries.id, id)).limit(1);
    if (delivery.length === 0) return notFound('Delivery not found');

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
    if (delivery[0].transporterId) {
      const t = await db.select({ name: parties.name }).from(parties).where(eq(parties.id, delivery[0].transporterId)).limit(1);
      transporterName = t[0]?.name || null;
    }

    const result = {
      ...delivery[0],
      transporterName,
      billNo: delivery[0].billNo,
      lines: enrichedLines,
      charges,
      saudaNo,
      saudaDate,
      contractId,
    };
    cacheSet(cacheKey, result, 120);
    return ok(result);
  } catch (err) {
    console.error('GET /api/deliveries/[id] error:', err);
    return serverError('Failed to fetch delivery');
  }
}

export async function PUT(req: NextRequest, context: Params) {
  try {
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid delivery ID');

    const body = await parseBody<Record<string, any>>(req);
    if (!body) return badRequest('Request body is required');

    const transporterId = await resolveParty(body.transporterName);

    await db.transaction(async (tx) => {
      await tx.update(deliveries).set({
        dispatchDate: body.dispatchDate ? new Date(body.dispatchDate) : new Date(),
        truckNo: body.truckNo || null,
        billNo: body.billNo || null,
        carrierBillDate: body.carrierBillDate ? new Date(body.carrierBillDate) : null,
        transporterId,
        advancePaymentCollected: body.advancePaymentCollected ? parseFloat(body.advancePaymentCollected).toString() : null,
        status: body.status || 'DISPATCHED',
      }).where(eq(deliveries.id, id));

      // Wipe existing lines & charges
      await tx.delete(deliveryLines).where(eq(deliveryLines.deliveryId, id));
      await tx.delete(deliveryCharges).where(eq(deliveryCharges.deliveryId, id));

      // Re-insert lines
      const lines = body.lines && Array.isArray(body.lines) ? body.lines : [];
      if (lines.length > 0) {
        for (const line of lines) {
          if (!line.contractLineId || !line.dispatchedWeight) continue;
          await tx.insert(deliveryLines).values({
            deliveryId: id,
            contractLineId: parseInt(line.contractLineId, 10),
            dispatchedBags: line.dispatchedBags ? parseFloat(line.dispatchedBags).toString() : null,
            dispatchedWeight: parseFloat(line.dispatchedWeight).toString(),
          });
        }
      } else if (body.contractLineId && body.dispatchedWeight) {
        // Fallback for single line inputs
        await tx.insert(deliveryLines).values({
          deliveryId: id,
          contractLineId: parseInt(body.contractLineId, 10),
          dispatchedBags: body.dispatchedBags ? parseFloat(body.dispatchedBags).toString() : null,
          dispatchedWeight: parseFloat(body.dispatchedWeight).toString(),
        });
      }

      // Re-insert charges
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
    });

    cacheInvalidate('deliveries');
    cacheInvalidate(`deliveries:${id}`);
    const updated = await db.select().from(deliveries).where(eq(deliveries.id, id)).limit(1);
    return ok(updated[0]);
  } catch (err) {
    console.error('PUT /api/deliveries/[id] error:', err);
    return serverError('Failed to update delivery');
  }
}

export async function DELETE(req: NextRequest, context: Params) {
  try {
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid ID');
    await db.delete(deliveries).where(eq(deliveries.id, id));
    cacheInvalidate('deliveries');
    return ok({ success: true, id });
  } catch (err) {
    console.error('DELETE /api/deliveries/[id] error:', err);
    return serverError('Failed to delete');
  }
}
