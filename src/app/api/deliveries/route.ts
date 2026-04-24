/**
 * GET  /api/deliveries  — List deliveries with transporter + lines (JOIN, no N+1)
 * POST /api/deliveries  — Create delivery linked to contract line
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { deliveries, deliveryLines, parties } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { ok, created, badRequest, serverError, parseBody } from '@/lib/api-helpers';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/cache';

export const dynamic = 'force-dynamic';

async function resolveParty(name: string | null | undefined): Promise<number | null> {
  if (!name?.trim()) return null;
  const clean = name.trim();
  const existing = await db.select({ id: parties.id }).from(parties).where(eq(parties.name, clean)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const [inserted] = await db.insert(parties).values({ name: clean }).returning({ id: parties.id });
  return inserted.id;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    // ── Search Mode ──
    if (q) {
      const searchPattern = `%${q}%`;
      const { or, ilike } = require('drizzle-orm');
      const rawDeliveries = await db.select({
        id: deliveries.id,
        dispatchDate: deliveries.dispatchDate,
        truckNo: deliveries.truckNo,
        transporterId: deliveries.transporterId,
        status: deliveries.status,
        createdAt: deliveries.createdAt,
        transporterName: parties.name,
      })
        .from(deliveries)
        .leftJoin(parties, eq(parties.id, deliveries.transporterId))
        .where(
          or(
            ilike(deliveries.truckNo, searchPattern),
            ilike(parties.name, searchPattern)
          )
        )
        .orderBy(desc(deliveries.id))
        .limit(100);

      const deliveryIds = rawDeliveries.map(d => d.id);
      let linesMap: Record<number, any[]> = {};

      if (deliveryIds.length > 0) {
        const allLines = await db.select().from(deliveryLines)
          .where(sql`${deliveryLines.deliveryId} IN (${sql.join(deliveryIds.map(id => sql`${id}`), sql`, `)})`);

        for (const line of allLines) {
          if (!linesMap[line.deliveryId]) linesMap[line.deliveryId] = [];
          linesMap[line.deliveryId].push(line);
        }
      }

      const formatted = rawDeliveries.map(d => ({
        ...d,
        lines: linesMap[d.id] || []
      }));
      return ok(formatted);
    }

    // ── Standard Paginated Mode ──
    const cacheKey = `deliveries:list:${page}:${limit}`;
    const cached = cacheGet<unknown[]>(cacheKey);
    if (cached) return ok(cached);

    // ── Single JOIN for delivery + transporter name ──
    const rawDeliveries = await db.select({
      id: deliveries.id,
      dispatchDate: deliveries.dispatchDate,
      truckNo: deliveries.truckNo,
      transporterId: deliveries.transporterId,
      status: deliveries.status,
      createdAt: deliveries.createdAt,
      transporterName: parties.name,
    })
      .from(deliveries)
      .leftJoin(parties, eq(parties.id, deliveries.transporterId))
      .orderBy(desc(deliveries.id))
      .limit(limit)
      .offset(offset);

    // ── Batch fetch all delivery lines for these deliveries ──
    const deliveryIds = rawDeliveries.map(d => d.id);
    let linesMap: Record<number, any[]> = {};

    if (deliveryIds.length > 0) {
      const allLines = await db.select().from(deliveryLines)
        .where(sql`${deliveryLines.deliveryId} IN (${sql.join(deliveryIds.map(id => sql`${id}`), sql`, `)})`);

      for (const line of allLines) {
        if (!linesMap[line.deliveryId]) linesMap[line.deliveryId] = [];
        linesMap[line.deliveryId].push(line);
      }
    }

    const enriched = rawDeliveries.map(d => ({
      ...d,
      lines: linesMap[d.id] || [],
    }));

    cacheSet(cacheKey, enriched, 30);
    return ok(enriched);
  } catch (err) {
    console.error('GET /api/deliveries error:', err);
    return serverError('Failed to fetch deliveries');
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody<Record<string, any>>(req);
    if (!body) return badRequest('Request body is required');
    if (!body.contractLineId) return badRequest('Contract Line ID is required');
    if (!body.dispatchedWeight) return badRequest('Dispatched weight is required');

    const transporterId = await resolveParty(body.transporterName);

    const [delivery] = await db.insert(deliveries).values({
      dispatchDate: body.dispatchDate ? new Date(body.dispatchDate) : new Date(),
      truckNo: body.truckNo || null,
      transporterId,
      status: 'DISPATCHED',
    }).returning();

    await db.insert(deliveryLines).values({
      deliveryId: delivery.id,
      contractLineId: parseInt(body.contractLineId, 10),
      dispatchedBags: body.dispatchedBags ? parseFloat(body.dispatchedBags).toString() : null,
      dispatchedWeight: parseFloat(body.dispatchedWeight).toString(),
    });

    cacheInvalidate('deliveries');
    return created(delivery);
  } catch (err) {
    console.error('POST /api/deliveries error:', err);
    return serverError('Failed to create delivery');
  }
}
