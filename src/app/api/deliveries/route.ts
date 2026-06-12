/**
 * GET  /api/deliveries  — List deliveries with transporter + lines (company+FY scoped)
 * POST /api/deliveries  — Create delivery linked to contract line
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { deliveries, deliveryLines, deliveryCharges, parties, contractLines, contracts } from '@/db/schema';
import { desc, eq, and, or, ilike, sql } from 'drizzle-orm';
import { ok, created, badRequest, serverError, parseBody, unauthorized } from '@/lib/api-helpers';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/cache';
import { triggerBackgroundWarmup } from '@/lib/warmup';
import { getRequestContext, stripAuditFields, writeAuditLog } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

async function resolveParty(name: string | null | undefined, tx?: any): Promise<number | null> {
  if (!name?.trim()) return null;
  const clean = name.trim();
  const dbCtx = tx || db;
  const existing = await dbCtx.select({ id: parties.id }).from(parties).where(eq(parties.name, clean)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const [inserted] = await dbCtx.insert(parties).values({ name: clean }).returning({ id: parties.id });
  return inserted.id;
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId } = ctx;
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    const scopeConditions = [
      eq(deliveries.companyId, companyId),
      eq(deliveries.fiscalYearId, fiscalYearId),
    ];

    // ── Search Mode ──
    if (q) {
      const searchPattern = `%${q}%`;
      const rawDeliveries = await db.select({
        id: deliveries.id,
        dispatchDate: deliveries.dispatchDate,
        truckNo: deliveries.truckNo,
        billNo: deliveries.billNo,
        carrierBillDate: deliveries.carrierBillDate,
        transporterId: deliveries.transporterId,
        advancePaymentCollected: deliveries.advancePaymentCollected,
        status: deliveries.status,
        createdAt: deliveries.createdAt,
        updatedAt: deliveries.updatedAt,
        createdBy: deliveries.createdBy,
        updatedBy: deliveries.updatedBy,
        transporterName: parties.name,
      })
        .from(deliveries)
        .leftJoin(parties, eq(parties.id, deliveries.transporterId))
        .where(
          and(
            ...scopeConditions,
            or(
              ilike(deliveries.truckNo, searchPattern),
              ilike(parties.name, searchPattern)
            )
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
      return ok(stripAuditFields(formatted, ctx.role));
    }

    // ── Standard Paginated Mode ──
    const cacheKey = `deliveries:list:${companyId}:${fiscalYearId}:${page}:${limit}`;
    const cached = cacheGet<unknown[]>(cacheKey);
    if (cached) return ok(stripAuditFields(cached, ctx.role));

    // ── Single JOIN for delivery + transporter name ──
    const rawDeliveries = await db.select({
      id: deliveries.id,
      dispatchDate: deliveries.dispatchDate,
      truckNo: deliveries.truckNo,
      billNo: deliveries.billNo,
      carrierBillDate: deliveries.carrierBillDate,
      transporterId: deliveries.transporterId,
      advancePaymentCollected: deliveries.advancePaymentCollected,
      status: deliveries.status,
      createdAt: deliveries.createdAt,
      updatedAt: deliveries.updatedAt,
      createdBy: deliveries.createdBy,
      updatedBy: deliveries.updatedBy,
      transporterName: parties.name,
    })
      .from(deliveries)
      .leftJoin(parties, eq(parties.id, deliveries.transporterId))
      .where(and(...scopeConditions))
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

    // Enrich with contract saudaNo and saudaDate for each delivery line
    for (const d of enriched) {
      for (const line of d.lines) {
        if (line.contractLineId) {
          const clRow = await db.select({ contractId: contractLines.contractId })
            .from(contractLines).where(eq(contractLines.id, line.contractLineId)).limit(1);
          if (clRow.length > 0) {
            const cRow = await db.select({ saudaNo: contracts.saudaNo, saudaDate: contracts.saudaDate })
              .from(contracts).where(eq(contracts.id, clRow[0].contractId)).limit(1);
            if (cRow.length > 0) {
              (line as any).saudaNo = cRow[0].saudaNo;
              (line as any).saudaDate = cRow[0].saudaDate;
            }
          }
        }
      }
      // Expose first line's saudaNo/saudaDate at top level for convenience
      const firstLine = d.lines[0] as any;
      (d as any).saudaNo = firstLine?.saudaNo || null;
      (d as any).saudaDate = firstLine?.saudaDate || null;
      (d as any).dispatchNo = d.id;
    }

    cacheSet(cacheKey, enriched, 30);
    return ok(stripAuditFields(enriched, ctx.role));
  } catch (err) {
    console.error('GET /api/deliveries error:', err);
    return serverError('Failed to fetch deliveries');
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId, userId } = ctx;
    const body = await parseBody<Record<string, any>>(req);
    if (!body) return badRequest('Request body is required');

    // Retrieve the active transaction database
    const result = await db.transaction(async (tx) => {
      const transporterId = await resolveParty(body.transporterName, tx);

      const [delivery] = await tx.insert(deliveries).values({
        companyId,
        fiscalYearId,
        dispatchDate: body.dispatchDate ? new Date(body.dispatchDate) : new Date(),
        truckNo: body.truckNo || null,
        billNo: body.billNo || null,
        carrierBillDate: body.carrierBillDate ? new Date(body.carrierBillDate) : null,
        transporterId,
        advancePaymentCollected: body.advancePaymentCollected ? parseFloat(body.advancePaymentCollected).toString() : null,
        status: body.status || 'DISPATCHED',
        createdBy: userId,
        updatedBy: userId,
      }).returning();

      // Write multi-line deliveryLines
      const lines = body.lines && Array.isArray(body.lines) ? body.lines : [];
      if (lines.length > 0) {
        for (const line of lines) {
          if (!line.contractLineId || !line.dispatchedWeight) continue;
          await tx.insert(deliveryLines).values({
            deliveryId: delivery.id,
            contractLineId: parseInt(line.contractLineId, 10),
            dispatchedBags: line.dispatchedBags ? parseFloat(line.dispatchedBags).toString() : null,
            dispatchedWeight: parseFloat(line.dispatchedWeight).toString(),
          });
        }
      } else if (body.contractLineId && body.dispatchedWeight) {
        // Fallback for single line inputs
        await tx.insert(deliveryLines).values({
          deliveryId: delivery.id,
          contractLineId: parseInt(body.contractLineId, 10),
          dispatchedBags: body.dispatchedBags ? parseFloat(body.dispatchedBags).toString() : null,
          dispatchedWeight: parseFloat(body.dispatchedWeight).toString(),
        });
      }

      // Write deliveryCharges
      const charges = body.charges && Array.isArray(body.charges) ? body.charges : [];
      for (const charge of charges) {
        if (!charge.chargeType || charge.amount === undefined || charge.amount === null) continue;
        const amtVal = parseFloat(charge.amount || '0');
        await tx.insert(deliveryCharges).values({
          deliveryId: delivery.id,
          chargeType: charge.chargeType,
          amount: amtVal.toString(),
        });
      }

      return delivery;
    });

    writeAuditLog({
      userId,
      companyId,
      action: 'CREATE',
      entityType: 'delivery',
      entityId: result.id,
      changes: { truckNo: body.truckNo, status: body.status || 'DISPATCHED' },
    });

    cacheInvalidate('deliveries');
    cacheInvalidate('dashboard');
    triggerBackgroundWarmup(companyId, fiscalYearId);
    return created(result);
  } catch (err) {
    console.error('POST /api/deliveries error:', err);
    return serverError('Failed to create delivery');
  }
}
