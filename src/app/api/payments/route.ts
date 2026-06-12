/**
 * GET  /api/payments  — List payments with party names (company+FY scoped)
 * POST /api/payments  — Create payment + allocate to bill + update balance + ledger posting
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { payments, paymentAllocations, bills, parties, ledger } from '@/db/schema';
import { desc, eq, and, or, ilike, sql } from 'drizzle-orm';
import { ok, created, badRequest, serverError, parseBody, unauthorized } from '@/lib/api-helpers';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/cache';
import { triggerBackgroundWarmup } from '@/lib/warmup';
import { getRequestContext, stripAuditFields, writeAuditLog } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

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
      eq(payments.companyId, companyId),
      eq(payments.fiscalYearId, fiscalYearId),
    ];

    // ── Search Mode ──
    if (q) {
      const searchPattern = `%${q}%`;
      const rawPayments = await db.select({
        id: payments.id,
        partyId: payments.partyId,
        paymentDate: payments.paymentDate,
        instrumentType: payments.instrumentType,
        instrumentNo: payments.instrumentNo,
        amount: payments.amount,
        depositedBank: payments.depositedBank,
        createdAt: payments.createdAt,
        updatedAt: payments.updatedAt,
        createdBy: payments.createdBy,
        updatedBy: payments.updatedBy,
        partyName: parties.name,
      })
        .from(payments)
        .leftJoin(parties, eq(parties.id, payments.partyId))
        .where(
          and(
            ...scopeConditions,
            or(
              ilike(parties.name, searchPattern),
              ilike(payments.instrumentNo, searchPattern),
              ilike(payments.depositedBank, searchPattern)
            )
          )
        )
        .orderBy(desc(payments.id))
        .limit(100);

      const paymentIds = rawPayments.map(p => p.id);
      let allocMap: Record<number, any[]> = {};

      if (paymentIds.length > 0) {
        const allAllocs = await db.select().from(paymentAllocations)
          .where(sql`${paymentAllocations.paymentId} IN (${sql.join(paymentIds.map(id => sql`${id}`), sql`, `)})`);

        for (const alloc of allAllocs) {
          if (!allocMap[alloc.paymentId]) allocMap[alloc.paymentId] = [];
          allocMap[alloc.paymentId].push(alloc);
        }
      }

      const enriched = rawPayments.map(p => ({
        ...p,
        allocations: allocMap[p.id] || [],
      }));
      return ok(stripAuditFields(enriched, ctx.role));
    }

    // ── Standard Paginated Mode ──
    const cacheKey = `payments:list:${companyId}:${fiscalYearId}:${page}:${limit}`;
    const cached = cacheGet<unknown[]>(cacheKey);
    if (cached) return ok(stripAuditFields(cached, ctx.role));

    // ── Single JOIN for payment + party name ──
    const rawPayments = await db.select({
      id: payments.id,
      partyId: payments.partyId,
      paymentDate: payments.paymentDate,
      instrumentType: payments.instrumentType,
      instrumentNo: payments.instrumentNo,
      amount: payments.amount,
      depositedBank: payments.depositedBank,
      createdAt: payments.createdAt,
      updatedAt: payments.updatedAt,
      createdBy: payments.createdBy,
      updatedBy: payments.updatedBy,
      partyName: parties.name,
    })
      .from(payments)
      .leftJoin(parties, eq(parties.id, payments.partyId))
      .where(and(...scopeConditions))
      .orderBy(desc(payments.id))
      .limit(limit)
      .offset(offset);

    // ── Batch fetch allocations ──
    const paymentIds = rawPayments.map(p => p.id);
    let allocMap: Record<number, any[]> = {};

    if (paymentIds.length > 0) {
      const allAllocs = await db.select().from(paymentAllocations)
        .where(sql`${paymentAllocations.paymentId} IN (${sql.join(paymentIds.map(id => sql`${id}`), sql`, `)})`);

      for (const alloc of allAllocs) {
        if (!allocMap[alloc.paymentId]) allocMap[alloc.paymentId] = [];
        allocMap[alloc.paymentId].push(alloc);
      }
    }

    const enriched = rawPayments.map(p => ({
      ...p,
      allocations: allocMap[p.id] || [],
    }));

    cacheSet(cacheKey, enriched, 30);
    return ok(stripAuditFields(enriched, ctx.role));
  } catch (err) {
    console.error('GET /api/payments error:', err);
    return serverError('Failed to fetch payments');
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId, userId } = ctx;
    const body = await parseBody<Record<string, any>>(req);
    if (!body || !body.billId) return badRequest('Bill ID is required');

    const billId = parseInt(body.billId, 10);
    const amount = parseFloat(body.amount || '0');
    if (amount <= 0) return badRequest('Valid amount is required');

    const billRecord = await db.select().from(bills)
      .where(and(eq(bills.id, billId), eq(bills.companyId, companyId), eq(bills.fiscalYearId, fiscalYearId)))
      .limit(1);
    if (billRecord.length === 0) return badRequest('Bill not found or does not belong to active company/fiscal year');

    let result: any;
    await db.transaction(async (tx) => {
      const [payment] = await tx.insert(payments).values({
        companyId,
        fiscalYearId,
        partyId: billRecord[0].partyId,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
        instrumentType: body.instrumentType || 'CASH',
        instrumentNo: body.instrumentNo || null,
        amount: amount.toString(),
        depositedBank: body.depositedBank || null,
        createdBy: userId,
        updatedBy: userId,
      }).returning();

      await tx.insert(paymentAllocations).values({
        paymentId: payment.id,
        billId,
        allocatedAmount: amount.toString(),
      });

      const newBalance = parseFloat(billRecord[0].balanceAmount) - amount;
      await tx.update(bills).set({ balanceAmount: newBalance.toString() }).where(eq(bills.id, billId));

      // Post to ledger (Credit the party's account)
      await tx.insert(ledger).values({
        companyId,
        fiscalYearId,
        transactionDate: payment.paymentDate,
        accountId: billRecord[0].partyId,
        sourceType: 'PAYMENT',
        sourceId: payment.id,
        debit: '0.00',
        credit: amount.toString(),
        narration: `Payment received via ${payment.instrumentType}${payment.instrumentNo ? ' #' + payment.instrumentNo : ''}`,
        createdBy: userId,
        updatedBy: userId,
      });

      result = payment;
    });

    writeAuditLog({
      userId,
      companyId,
      action: 'CREATE',
      entityType: 'payment',
      entityId: result.id,
      changes: { billId, amount: body.amount, instrumentType: body.instrumentType },
    });

    cacheInvalidate('payments');
    cacheInvalidate('bills');
    cacheInvalidate('ledger');
    cacheInvalidate('dashboard');
    triggerBackgroundWarmup(companyId, fiscalYearId);
    return created(result);
  } catch (err) {
    console.error('POST /api/payments error:', err);
    return serverError('Failed to create payment');
  }
}
