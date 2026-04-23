/**
 * GET  /api/parties        — List all parties (cached, paginated)
 * POST /api/parties        — Create a new party
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { parties, partyTaxIds } from '@/db/schema';
import { desc, eq, ilike, sql } from 'drizzle-orm';
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

    const cacheKey = `parties:list:${page}:${limit}:${q}`;
    const cached = cacheGet<unknown[]>(cacheKey);
    if (cached) return ok(cached);

    let query = db.select().from(parties);

    if (q) {
      query = query.where(ilike(parties.name, `%${q}%`)) as typeof query;
    }

    const data = await query
      .orderBy(desc(parties.id))
      .limit(limit)
      .offset(offset);

    cacheSet(cacheKey, data, 60);
    return ok(data);
  } catch (err) {
    console.error('GET /api/parties error:', err);
    return serverError('Failed to fetch parties');
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody<Record<string, string>>(req);
    if (!body || !body.name) {
      return badRequest('Party name is required');
    }

    const inserted = await db.insert(parties).values({
      name: body.name,
      address: body.address || null,
      landmark: body.landmark || null,
      place: body.place || null,
      stateName: body.stateName || null,
      pinCode: body.pinCode || null,
      creditLimit: body.creditLimit || null,
      phone: body.phone || null,
      smsMobile: body.smsMobile || null,
      mill: body.mill || null,
      fax: body.fax || null,
      emailIds: body.emailIds || null,
      designation: body.designation || null,
    }).returning();

    const partyId = inserted[0].id;

    // Insert tax IDs if provided
    const taxEntries = [];
    if (body.gstin) taxEntries.push({ partyId, taxType: 'GSTIN' as const, taxValue: body.gstin });
    if (body.vatTin) taxEntries.push({ partyId, taxType: 'VAT_TIN' as const, taxValue: body.vatTin });
    if (body.cstTin) taxEntries.push({ partyId, taxType: 'CST_TIN' as const, taxValue: body.cstTin });
    if (body.cstNo) taxEntries.push({ partyId, taxType: 'CST_NO' as const, taxValue: body.cstNo });

    if (taxEntries.length > 0) {
      await db.insert(partyTaxIds).values(taxEntries);
    }

    cacheInvalidate('parties');
    return created(inserted[0]);
  } catch (err: any) {
    console.error('POST /api/parties error:', err);
    if (err.message?.includes('unique')) {
      return badRequest('A party with this name already exists');
    }
    return serverError('Failed to create party');
  }
}
