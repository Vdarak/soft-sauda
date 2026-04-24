/**
 * GET /api/payments/:id — Get payment with allocations
 * PUT /api/payments/:id — Update payment
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { payments, paymentAllocations, bills, parties } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, badRequest, notFound, serverError, parseBody } from '@/lib/api-helpers';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/cache';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: Params) {
  try {
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid payment ID');

    const cacheKey = `payments:${id}`;
    const cached = cacheGet(cacheKey);
    if (cached) return ok(cached);

    const payment = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
    if (payment.length === 0) return notFound('Payment not found');

    const party = await db.select({ name: parties.name }).from(parties).where(eq(parties.id, payment[0].partyId)).limit(1);
    const allocs = await db.select().from(paymentAllocations).where(eq(paymentAllocations.paymentId, id));

    const result = { ...payment[0], partyName: party[0]?.name || 'Unknown', allocations: allocs };
    cacheSet(cacheKey, result, 60);
    return ok(result);
  } catch (err) {
    console.error('GET /api/payments/[id] error:', err);
    return serverError('Failed to fetch payment');
  }
}

export async function PUT(req: NextRequest, context: Params) {
  try {
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid payment ID');

    const body = await parseBody<Record<string, any>>(req);
    if (!body) return badRequest('Request body is required');

    const amount = parseFloat(body.amount || '0');
    if (amount <= 0) return badRequest('Valid amount is required');

    const existingPayment = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
    if (existingPayment.length === 0) return notFound('Payment not found');
    const oldAmount = Number(existingPayment[0].amount || 0);

    const allocations = await db.select().from(paymentAllocations).where(eq(paymentAllocations.paymentId, id));

    await db.transaction(async (tx) => {
      await tx.update(payments).set({
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : undefined,
        instrumentType: body.instrumentType || 'CASH',
        instrumentNo: body.instrumentNo || null,
        amount: amount.toString(),
        depositedBank: body.depositedBank || null,
      }).where(eq(payments.id, id));

      // If single allocation and amount changed, adjust bill balance
      if (allocations.length === 1 && oldAmount !== amount) {
        const allocation = allocations[0];
        await tx.update(paymentAllocations).set({ allocatedAmount: amount.toString() }).where(eq(paymentAllocations.id, allocation.id));

        const billRecord = await tx.select().from(bills).where(eq(bills.id, allocation.billId)).limit(1);
        if (billRecord.length > 0) {
          const currentBalance = Number(billRecord[0].balanceAmount || 0);
          const newBalance = currentBalance + oldAmount - amount;
          await tx.update(bills).set({ balanceAmount: newBalance.toString() }).where(eq(bills.id, allocation.billId));
        }
      }
    });

    cacheInvalidate('payments');
    cacheInvalidate('bills');
    const updated = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
    return ok(updated[0]);
  } catch (err) {
    console.error('PUT /api/payments/[id] error:', err);
    return serverError('Failed to update payment');
  }
}

export async function DELETE(req: NextRequest, context: Params) {
  try {
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid ID');
    await db.delete(payments).where(eq(payments.id, id));
    cacheInvalidate('payments');
    return ok({ success: true, id });
  } catch (err) {
    console.error('DELETE /api/payments/[id] error:', err);
    return serverError('Failed to delete');
  }
}
