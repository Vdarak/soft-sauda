/**
 * GET  /api/commodities        — List all commodities with group info
 * POST /api/commodities        — Create commodity with packaging + specs
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { commodities, commodityPackaging, commoditySpecifications, commodityGroups } from '@/db/schema';
import { desc, eq, ilike } from 'drizzle-orm';
import { ok, created, badRequest, serverError, parseBody } from '@/lib/api-helpers';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const q = searchParams.get('q') || '';
    const offset = (page - 1) * limit;

    const cacheKey = `commodities:list:${page}:${limit}:${q}`;
    const cached = cacheGet<unknown[]>(cacheKey);
    if (cached) return ok(cached);

    let query = db.select().from(commodities);
    if (q) {
      query = query.where(ilike(commodities.name, `%${q}%`)) as typeof query;
    }

    const data = await query.orderBy(desc(commodities.id)).limit(limit).offset(offset);

    cacheSet(cacheKey, data, 120);
    return ok(data);
  } catch (err) {
    console.error('GET /api/commodities error:', err);
    return serverError('Failed to fetch commodities');
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody<Record<string, any>>(req);
    if (!body || !body.name) return badRequest('Commodity name is required');

    let result: any;
    await db.transaction(async (tx) => {
      const [inserted] = await tx.insert(commodities).values({
        name: body.name,
        description: body.description || null,
        shortName: body.shortName || null,
        hsnCode: body.hsnCode || null,
        unit: body.unit || null,
        groupId: body.groupId || null,
      }).returning();

      const commId = inserted.id;

      // Insert packaging rows
      if (body.packaging && Array.isArray(body.packaging) && body.packaging.length > 0) {
        const packInserts = body.packaging.map((p: any) => ({
          commodityId: commId,
          packingWeight: (p.packingWeight || '0').toString(),
          packingType: p.packingType || 'Default',
          sellerBrokerageRate: p.sellerBrokerageRate?.toString() || null,
          sellerBrokerageType: p.sellerBrokerageType || null,
          buyerBrokerageRate: p.buyerBrokerageRate?.toString() || null,
          buyerBrokerageType: p.buyerBrokerageType || null,
        }));
        await tx.insert(commodityPackaging).values(packInserts);
      }

      // Insert specifications rows
      if (body.specifications && Array.isArray(body.specifications) && body.specifications.length > 0) {
        const specInserts = body.specifications.map((s: any) => ({
          commodityId: commId,
          specification: s.specification || 'Default',
          specValue: s.specValue?.toString() || null,
          minMax: s.minMax || null,
          remarks: s.remarks || null,
        }));
        await tx.insert(commoditySpecifications).values(specInserts);
      }

      result = inserted;
    });

    cacheInvalidate('commodities');
    return created(result);
  } catch (err: any) {
    console.error('POST /api/commodities error:', err);
    if (err.message?.includes('unique')) {
      return badRequest('A commodity with this name already exists');
    }
    return serverError('Failed to create commodity');
  }
}
