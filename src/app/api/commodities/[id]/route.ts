/**
 * GET /api/commodities/:id  — Get commodity with packaging + specs
 * PUT /api/commodities/:id  — Update commodity (wipe & rewrite children)
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { commodities, commodityPackaging, commoditySpecifications } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, badRequest, notFound, serverError, parseBody } from '@/lib/api-helpers';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/cache';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: Params) {
  try {
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid commodity ID');

    const cacheKey = `commodities:${id}`;
    const cached = cacheGet(cacheKey);
    if (cached) return ok(cached);

    const commodity = await db.select().from(commodities).where(eq(commodities.id, id)).limit(1);
    if (commodity.length === 0) return notFound('Commodity not found');

    const packaging = await db.select().from(commodityPackaging).where(eq(commodityPackaging.commodityId, id));
    const specifications = await db.select().from(commoditySpecifications).where(eq(commoditySpecifications.commodityId, id));

    const result = { ...commodity[0], packaging, specifications };
    cacheSet(cacheKey, result, 600);
    return ok(result);
  } catch (err) {
    console.error('GET /api/commodities/[id] error:', err);
    return serverError('Failed to fetch commodity');
  }
}

export async function PUT(req: NextRequest, context: Params) {
  try {
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid commodity ID');

    const body = await parseBody<Record<string, any>>(req);
    if (!body || !body.name) return badRequest('Commodity name is required');

    await db.transaction(async (tx) => {
      await tx.update(commodities).set({
        name: body.name,
        description: body.description || null,
        shortName: body.shortName || null,
        hsnCode: body.hsnCode || null,
        unit: body.unit || null,
      }).where(eq(commodities.id, id));

      // Wipe & rewrite packaging
      await tx.delete(commodityPackaging).where(eq(commodityPackaging.commodityId, id));
      if (body.packaging && Array.isArray(body.packaging) && body.packaging.length > 0) {
        const packInserts = body.packaging.map((p: any) => ({
          commodityId: id,
          packingWeight: (p.packingWeight || '0').toString(),
          packingType: p.packingType || 'Default',
          sellerBrokerageRate: p.sellerBrokerageRate?.toString() || null,
          sellerBrokerageType: p.sellerBrokerageType || null,
          buyerBrokerageRate: p.buyerBrokerageRate?.toString() || null,
          buyerBrokerageType: p.buyerBrokerageType || null,
        }));
        await tx.insert(commodityPackaging).values(packInserts);
      }

      // Wipe & rewrite specs
      await tx.delete(commoditySpecifications).where(eq(commoditySpecifications.commodityId, id));
      if (body.specifications && Array.isArray(body.specifications) && body.specifications.length > 0) {
        const specInserts = body.specifications.map((s: any) => ({
          commodityId: id,
          specification: s.specification || 'Default',
          specValue: s.specValue?.toString() || null,
          minMax: s.minMax || null,
          remarks: s.remarks || null,
        }));
        await tx.insert(commoditySpecifications).values(specInserts);
      }
    });

    cacheInvalidate('commodities');
    const updated = await db.select().from(commodities).where(eq(commodities.id, id)).limit(1);
    return ok(updated[0]);
  } catch (err) {
    console.error('PUT /api/commodities/[id] error:', err);
    return serverError('Failed to update commodity');
  }
}
