/**
 * GET /api/deliveries/:id — Get delivery with lines
 * PUT /api/deliveries/:id — Update delivery
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { deliveries, deliveryLines, parties } from '@/db/schema';
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
    let transporterName = null;
    if (delivery[0].transporterId) {
      const t = await db.select({ name: parties.name }).from(parties).where(eq(parties.id, delivery[0].transporterId)).limit(1);
      transporterName = t[0]?.name || null;
    }

    const result = { ...delivery[0], transporterName, lines };
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
        transporterId,
      }).where(eq(deliveries.id, id));

      if (body.contractLineId && body.dispatchedWeight) {
        const existingLine = await tx.select().from(deliveryLines).where(eq(deliveryLines.deliveryId, id)).limit(1);
        if (existingLine.length > 0) {
          await tx.update(deliveryLines).set({
            contractLineId: parseInt(body.contractLineId, 10),
            dispatchedBags: body.dispatchedBags ? parseFloat(body.dispatchedBags).toString() : null,
            dispatchedWeight: parseFloat(body.dispatchedWeight).toString(),
          }).where(eq(deliveryLines.id, existingLine[0].id));
        } else {
          await tx.insert(deliveryLines).values({
            deliveryId: id,
            contractLineId: parseInt(body.contractLineId, 10),
            dispatchedBags: body.dispatchedBags ? parseFloat(body.dispatchedBags).toString() : null,
            dispatchedWeight: parseFloat(body.dispatchedWeight).toString(),
          });
        }
      }
    });

    cacheInvalidate('deliveries');
    const updated = await db.select().from(deliveries).where(eq(deliveries.id, id)).limit(1);
    return ok(updated[0]);
  } catch (err) {
    console.error('PUT /api/deliveries/[id] error:', err);
    return serverError('Failed to update delivery');
  }
}
