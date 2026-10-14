/**
 * GET  /api/deliveries  — List deliveries with transporter + lines (company+FY scoped)
 * POST /api/deliveries  — Create delivery linked to contract line
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { deliveries, deliveryLines, deliveryCharges, parties, contractLines, contracts, commodities, contractParties } from '@/db/schema';
import { desc, eq, and, or, ilike, sql } from 'drizzle-orm';
import { ok, created, badRequest, serverError, parseBody, unauthorized } from '@/lib/api-helpers';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/cache';
import { triggerBackgroundWarmup } from '@/lib/warmup';
import { getRequestContext, stripAuditFields, writeAuditLog } from '@/lib/middleware';
import { updateContractExecutionBalances } from '@/lib/contract-execution';

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

    const cacheKey = q ? null : `deliveries:list:${companyId}:${fiscalYearId}:${page}:${limit}`;
    if (cacheKey) {
      const cached = cacheGet<unknown[]>(cacheKey);
      if (cached) return ok(stripAuditFields(cached, ctx.role));
    }

    let rawDeliveries: any[] = [];

    // ── Search Mode ──
    if (q) {
      const searchPattern = `%${q}%`;
      const isNum = !isNaN(Number(q)) ? Number(q) : null;
      rawDeliveries = await db.select({
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
              ilike(parties.name, searchPattern),
              ilike(deliveries.billNo, searchPattern),
              isNum !== null ? eq(deliveries.id, isNum) : undefined,
              sql`EXISTS (
                SELECT 1 FROM delivery_lines dl 
                JOIN contract_lines cl ON cl.id = dl.contract_line_id
                JOIN contracts c ON c.id = cl.contract_id
                LEFT JOIN contract_parties cp ON cp.contract_id = c.id
                LEFT JOIN parties p ON p.id = cp.party_id
                WHERE dl.delivery_id = ${deliveries.id}
                  AND (${isNum !== null ? sql`c.sauda_no = ${isNum} OR ` : sql``} p.name ILIKE ${searchPattern})
              )`
            )
          )
        )
        .orderBy(desc(deliveries.id))
        .limit(limit)
        .offset(offset);
    } else {
      // ── Single JOIN for delivery + transporter name ──
      rawDeliveries = await db.select({
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
    }

    // ── Batch fetch all delivery lines with commodities ──
    const deliveryIds = rawDeliveries.map(d => d.id);
    let linesMap: Record<number, any[]> = {};
    let contractIds: number[] = [];

    if (deliveryIds.length > 0) {
      const allLines = await db.select({
        id: deliveryLines.id,
        deliveryId: deliveryLines.deliveryId,
        contractLineId: deliveryLines.contractLineId,
        dispatchedBags: deliveryLines.dispatchedBags,
        dispatchedWeight: deliveryLines.dispatchedWeight,
        commodityName: commodities.name,
        rate: contractLines.rate,
        amount: contractLines.amount,
        contractId: contractLines.contractId,
      })
        .from(deliveryLines)
        .leftJoin(contractLines, eq(contractLines.id, deliveryLines.contractLineId))
        .leftJoin(commodities, eq(commodities.id, contractLines.commodityId))
        .where(sql`${deliveryLines.deliveryId} IN (${sql.join(deliveryIds.map(id => sql`${id}`), sql`, `)})`);

      for (const line of allLines) {
        if (!linesMap[line.deliveryId]) linesMap[line.deliveryId] = [];
        linesMap[line.deliveryId].push(line);
        if (line.contractId) contractIds.push(line.contractId);
      }
    }

    // Batch fetch contract parties and sauda info
    const allContractIds = [...new Set([...deliveryIds, ...contractIds])];
    let contractMap: Record<number, { saudaNo: number; saudaDate: Date | null }> = {};
    let partyMap: Record<number, { role: string; name: string | null }[]> = {};

    if (allContractIds.length > 0) {
      const [cRows, pRows] = await Promise.all([
        db.select({ id: contracts.id, saudaNo: contracts.saudaNo, saudaDate: contracts.saudaDate })
          .from(contracts).where(sql`${contracts.id} IN (${sql.join(allContractIds.map(id => sql`${id}`), sql`, `)})`),
        db.select({ contractId: contractParties.contractId, role: contractParties.role, name: parties.name })
          .from(contractParties)
          .leftJoin(parties, eq(parties.id, contractParties.partyId))
          .where(sql`${contractParties.contractId} IN (${sql.join(allContractIds.map(id => sql`${id}`), sql`, `)})`),
      ]);

      cRows.forEach(c => { contractMap[c.id] = { saudaNo: c.saudaNo, saudaDate: c.saudaDate }; });
      pRows.forEach(p => {
        if (!partyMap[p.contractId]) partyMap[p.contractId] = [];
        partyMap[p.contractId].push({ role: p.role, name: p.name });
      });
    }

    const enriched = rawDeliveries.map(d => {
      const dLines = linesMap[d.id] || [];
      const firstLine = dLines[0] || {};
      const cInfo = contractMap[d.id] || (firstLine.contractId ? contractMap[firstLine.contractId] : null);
      const cParties = partyMap[d.id] || (firstLine.contractId ? partyMap[firstLine.contractId] : []) || [];
      return {
        ...d,
        lines: dLines,
        dispatchNo: cInfo?.saudaNo || d.id,
        saudaNo: cInfo?.saudaNo || d.id,
        saudaDate: cInfo?.saudaDate || d.dispatchDate,
        sellerName: cParties.find(p => p.role === 'SELLER')?.name || 'Unknown',
        buyerName: cParties.find(p => p.role === 'BUYER')?.name || 'Unknown',
        sellerBroker: cParties.find(p => p.role === 'SELLER_BROKER')?.name || null,
        buyerBroker: cParties.find(p => p.role === 'BUYER_BROKER')?.name || null,
        commodityName: firstLine.commodityName || 'Unknown',
        dispatchedBags: firstLine.dispatchedBags || '0',
        dispatchedWeight: firstLine.dispatchedWeight || '0',
        rate: firstLine.rate || '0',
        amount: firstLine.amount || '0',
      };
    });

    if (cacheKey) cacheSet(cacheKey, enriched, 30);
    return ok(stripAuditFields(enriched, ctx.role));
  } catch (err: any) {
    console.error('GET /api/deliveries error:', err);
    return serverError(`Failed to fetch deliveries: ${err?.message || err}\n${err?.stack || ''}`);
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
      const affectedLineIds: number[] = [];
      const lines = body.lines && Array.isArray(body.lines) ? body.lines : [];
      if (lines.length > 0) {
        for (const line of lines) {
          if (!line.contractLineId || !line.dispatchedWeight) continue;
          const cLineId = parseInt(line.contractLineId, 10);
          await tx.insert(deliveryLines).values({
            deliveryId: delivery.id,
            contractLineId: cLineId,
            dispatchedBags: line.dispatchedBags ? parseFloat(line.dispatchedBags).toString() : null,
            dispatchedWeight: parseFloat(line.dispatchedWeight).toString(),
          });
          affectedLineIds.push(cLineId);
        }
      } else if (body.contractLineId && body.dispatchedWeight) {
        // Fallback for single line inputs
        const cLineId = parseInt(body.contractLineId, 10);
        await tx.insert(deliveryLines).values({
          deliveryId: delivery.id,
          contractLineId: cLineId,
          dispatchedBags: body.dispatchedBags ? parseFloat(body.dispatchedBags).toString() : null,
          dispatchedWeight: parseFloat(body.dispatchedWeight).toString(),
        });
        affectedLineIds.push(cLineId);
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

      // Recompute parent contract line execution balances (replicating SP_sauda2rear)
      if (affectedLineIds.length > 0) {
        await updateContractExecutionBalances(affectedLineIds, tx);
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
    cacheInvalidate('contracts');
    cacheInvalidate('dashboard');
    triggerBackgroundWarmup(companyId, fiscalYearId);
    return created(result);
  } catch (err) {
    console.error('POST /api/deliveries error:', err);
    return serverError('Failed to create delivery');
  }
}
