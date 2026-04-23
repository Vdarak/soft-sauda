/**
 * GET  /api/payments  — List payments with party names (JOIN, no N+1)
 * POST /api/payments  — Create payment + allocate to bill + update balance
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { payments, paymentAllocations, bills, parties } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { ok, created, badRequest, serverError, parseBody } from '@/lib/api-helpers';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    const cacheKey = `payments:list:${page}:${limit}`;
    const cached = cacheGet<unknown[]>(cacheKey);
    if (cached) return ok(cached);

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
      partyName: parties.name,
    })
      .from(payments)
      .leftJoin(parties, eq(parties.id, payments.partyId))
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
    return ok(enriched);
  } catch (err) {
    console.error('GET /api/payments error:', err);
    return serverError('Failed to fetch payments');
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody<Record<string, any>>(req);
    if (!body || !body.billId) return badRequest('Bill ID is required');

    const billId = parseInt(body.billId, 10);
    const amount = parseFloat(body.amount || '0');
    if (amount <= 0) return badRequest('Valid amount is required');

    const billRecord = await db.select().from(bills).where(eq(bills.id, billId)).limit(1);
    if (billRecord.length === 0) return badRequest('Bill not found');

    let result: any;
    await db.transaction(async (tx) => {
      const [payment] = await tx.insert(payments).values({
        partyId: billRecord[0].partyId,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
        instrumentType: body.instrumentType || 'CASH',
        instrumentNo: body.instrumentNo || null,
        amount: amount.toString(),
        depositedBank: body.depositedBank || null,
      }).returning();

      await tx.insert(paymentAllocations).values({
        paymentId: payment.id,
        billId,
        allocatedAmount: amount.toString(),
      });

      const newBalance = parseFloat(billRecord[0].balanceAmount) - amount;
      await tx.update(bills).set({ balanceAmount: newBalance.toString() }).where(eq(bills.id, billId));

      result = payment;
    });

    cacheInvalidate('payments');
    cacheInvalidate('bills');
    return created(result);
  } catch (err) {
    console.error('POST /api/payments error:', err);
    return serverError('Failed to create payment');
  }
}
