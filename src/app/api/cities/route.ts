/**
 * GET  /api/cities — List cities with district + state joined
 * POST /api/cities — Create city (auto-creates district/state if needed)
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { cities, districts, states } from '@/db/schema';
import { desc, eq, ilike, sql, and } from 'drizzle-orm';
import { ok, created, badRequest, serverError, parseBody } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/** Resolve or create a state by name */
async function resolveState(name: string): Promise<number> {
  const clean = name.trim();
  const existing = await db.select({ id: states.id }).from(states).where(eq(states.name, clean)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const [inserted] = await db.insert(states).values({ name: clean }).returning({ id: states.id });
  return inserted.id;
}

/** Resolve or create a district by name + stateId */
async function resolveDistrict(name: string, stateId: number): Promise<number> {
  const clean = name.trim();
  const existing = await db.select({ id: districts.id }).from(districts)
    .where(and(eq(districts.stateId, stateId), eq(districts.name, clean))).limit(1);
  if (existing.length > 0) return existing[0].id;
  const [inserted] = await db.insert(districts).values({ name: clean, stateId }).returning({ id: districts.id });
  return inserted.id;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');

    let query = db.select({
      id: cities.id,
      name: cities.name,
      pincode: cities.pincode,
      districtId: cities.districtId,
      districtName: districts.name,
      stateId: districts.stateId,
      stateName: states.name,
    })
      .from(cities)
      .leftJoin(districts, eq(districts.id, cities.districtId))
      .leftJoin(states, eq(states.id, districts.stateId))
      .orderBy(cities.name)
      .limit(200);

    if (q) {
      const rows = await db.select({
        id: cities.id,
        name: cities.name,
        pincode: cities.pincode,
        districtId: cities.districtId,
        districtName: districts.name,
        stateId: districts.stateId,
        stateName: states.name,
      })
        .from(cities)
        .leftJoin(districts, eq(districts.id, cities.districtId))
        .leftJoin(states, eq(states.id, districts.stateId))
        .where(ilike(cities.name, `%${q}%`))
        .orderBy(cities.name)
        .limit(50);
      return ok(rows);
    }

    const rows = await query;
    return ok(rows);
  } catch (err) {
    console.error('GET /api/cities error:', err);
    return serverError('Failed to fetch cities');
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody<Record<string, any>>(req);
    if (!body) return badRequest('Request body is required');
    if (!body.name) return badRequest('City name is required');
    if (!body.stateName) return badRequest('State is required');
    if (!body.districtName) return badRequest('District is required');

    const stateId = await resolveState(body.stateName);
    const districtId = await resolveDistrict(body.districtName, stateId);

    const [city] = await db.insert(cities).values({
      name: body.name.trim(),
      districtId,
      pincode: body.pincode || null,
    }).returning();

    return created(city);
  } catch (err) {
    console.error('POST /api/cities error:', err);
    return serverError('Failed to create city');
  }
}
