/**
 * GET    /api/cities/:id — Get a single city
 * PUT    /api/cities/:id — Update city fields
 * DELETE /api/cities/:id — Hard-delete a city record
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { cities, districts, states } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { ok, badRequest, notFound, serverError, parseBody } from '@/lib/api-helpers';
import { getRequestContext } from '@/lib/middleware';
import { triggerBackgroundWarmup } from '@/lib/warmup';

type Params = { params: Promise<{ id: string }> };

async function resolveState(name: string): Promise<number> {
  const clean = name.trim();
  const existing = await db.select({ id: states.id }).from(states).where(eq(states.name, clean)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const [inserted] = await db.insert(states).values({ name: clean }).returning({ id: states.id });
  return inserted.id;
}

async function resolveDistrict(name: string, stateId: number): Promise<number> {
  const clean = name.trim();
  const existing = await db.select({ id: districts.id }).from(districts)
    .where(and(eq(districts.stateId, stateId), eq(districts.name, clean))).limit(1);
  if (existing.length > 0) return existing[0].id;
  const [inserted] = await db.insert(districts).values({ name: clean, stateId }).returning({ id: districts.id });
  return inserted.id;
}

export async function GET(req: NextRequest, context: Params) {
  try {
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid city ID');

    const rows = await db.select({
      id: cities.id,
      name: cities.name,
      pincode: cities.pincode,
      stdCode: cities.stdCode,
      districtId: cities.districtId,
      districtName: districts.name,
      stateName: states.name,
    })
      .from(cities)
      .leftJoin(districts, eq(districts.id, cities.districtId))
      .leftJoin(states, eq(states.id, districts.stateId))
      .where(eq(cities.id, id))
      .limit(1);

    if (rows.length === 0) return notFound('City not found');
    return ok(rows[0]);
  } catch (err) {
    console.error('GET /api/cities/[id] error:', err);
    return serverError('Failed to fetch city');
  }
}

export async function PUT(req: NextRequest, context: Params) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid city ID');

    const body = await parseBody<Record<string, any>>(req);
    if (!body || !body.name) return badRequest('City name is required');
    if (!body.stateName) return badRequest('State is required');
    if (!body.districtName) return badRequest('District is required');

    const stateId = await resolveState(body.stateName);
    const districtId = await resolveDistrict(body.districtName, stateId);

    const [updated] = await db.update(cities).set({
      name: body.name.trim(),
      districtId,
      pincode: body.pincode || null,
      stdCode: body.stdCode || null,
    }).where(eq(cities.id, id)).returning();

    triggerBackgroundWarmup(ctx.companyId, ctx.fiscalYearId);
    return ok(updated);
  } catch (err) {
    console.error('PUT /api/cities/[id] error:', err);
    return serverError('Failed to update city');
  }
}

export async function DELETE(req: NextRequest, context: Params) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid city ID');

    const existing = await db.select({ id: cities.id }).from(cities).where(eq(cities.id, id)).limit(1);
    if (existing.length === 0) return notFound('City not found');

    await db.delete(cities).where(eq(cities.id, id));

    triggerBackgroundWarmup(ctx.companyId, ctx.fiscalYearId);
    return ok({ id, deleted: true });
  } catch (err) {
    console.error('DELETE /api/cities/[id] error:', err);
    return serverError('Failed to delete city');
  }
}
