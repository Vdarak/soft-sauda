/**
 * GET /api/payments/:id — Get payment with allocations (company+FY scoped)
 * PUT /api/payments/:id — Update payment
 * DELETE /api/payments/:id — Delete payment
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { payments, paymentAllocations, bills, parties, ledger, users } from '@/db/schema';
import { eq, and, aliasedTable } from 'drizzle-orm';
import { ok, badRequest, notFound, serverError, parseBody, unauthorized } from '@/lib/api-helpers';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/cache';
import { triggerBackgroundWarmup } from '@/lib/warmup';
import { getRequestContext, stripAuditFields, writeAuditLog } from '@/lib/middleware';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: Params) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId, role } = ctx;
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid payment ID');

    const cacheKey = `payments:${id}`;
    const cached = cacheGet(cacheKey);
    if (cached) return ok(stripAuditFields(cached, role));

    const creator = aliasedTable(users, 'creator');
    const updater = aliasedTable(users, 'updater');

    const paymentRows = await db.select({
      payment: payments,
      createdByUsername: creator.username,
      createdByDisplayName: creator.displayName,
      updatedByUsername: updater.username,
      updatedByDisplayName: updater.displayName,
    })
      .from(payments)
      .leftJoin(creator, eq(payments.createdBy, creator.id))
      .leftJoin(updater, eq(payments.updatedBy, updater.id))
      .where(and(eq(payments.id, id), eq(payments.companyId, companyId), eq(payments.fiscalYearId, fiscalYearId)))
      .limit(1);

    if (paymentRows.length === 0) return notFound('Payment not found');

    const paymentData = paymentRows[0].payment;
    const party = await db.select({ name: parties.name }).from(parties).where(eq(parties.id, paymentData.partyId)).limit(1);
    const allocs = await db.select().from(paymentAllocations).where(eq(paymentAllocations.paymentId, id));

    const result = {
      ...paymentData,
      partyName: party[0]?.name || 'Unknown',
      allocations: allocs,
      createdByUsername: paymentRows[0].createdByUsername,
      createdByDisplayName: paymentRows[0].createdByDisplayName,
      updatedByUsername: paymentRows[0].updatedByUsername,
      updatedByDisplayName: paymentRows[0].updatedByDisplayName,
    };
    cacheSet(cacheKey, result, 60);
    return ok(stripAuditFields(result, role));
  } catch (err) {
    console.error('GET /api/payments/[id] error:', err);
    return serverError('Failed to fetch payment');
  }
}

export async function PUT(req: NextRequest, context: Params) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId, userId, role } = ctx;
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid payment ID');

    const body = await parseBody<Record<string, any>>(req);
    if (!body) return badRequest('Request body is required');

    const amount = parseFloat(body.amount || '0');
    if (amount <= 0) return badRequest('Valid amount is required');

    // Verify ownership/scoping
    const existingPayment = await db.select().from(payments)
      .where(and(eq(payments.id, id), eq(payments.companyId, companyId), eq(payments.fiscalYearId, fiscalYearId)))
      .limit(1);
    if (existingPayment.length === 0) return notFound('Payment not found or does not belong to active company/fiscal year');

    const oldAmount = Number(existingPayment[0].amount || 0);
    const allocations = await db.select().from(paymentAllocations).where(eq(paymentAllocations.paymentId, id));

    await db.transaction(async (tx) => {
      const paymentDate = body.paymentDate ? new Date(body.paymentDate) : new Date();

      await tx.update(payments).set({
        paymentDate,
        instrumentType: body.instrumentType || 'CASH',
        instrumentNo: body.instrumentNo || null,
        amount: amount.toString(),
        depositedBank: body.depositedBank || null,
        updatedAt: new Date(),
        updatedBy: userId,
      }).where(eq(payments.id, id));

      // Update corresponding ledger entry
      await tx.update(ledger).set({
        transactionDate: paymentDate,
        credit: amount.toString(),
        narration: `Payment received via ${body.instrumentType}${body.instrumentNo ? ' #' + body.instrumentNo : ''}`,
        updatedAt: new Date(),
        updatedBy: userId,
      }).where(and(eq(ledger.sourceType, 'PAYMENT'), eq(ledger.sourceId, id)));

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

    writeAuditLog({
      userId,
      companyId,
      action: 'UPDATE',
      entityType: 'payment',
      entityId: id,
      changes: { amount: body.amount, instrumentType: body.instrumentType },
    });

    cacheInvalidate('payments');
    cacheInvalidate('bills');
    cacheInvalidate('ledger');
    cacheInvalidate(`payments:${id}`);
    triggerBackgroundWarmup(companyId, fiscalYearId);
    const updated = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
    return ok(stripAuditFields(updated[0], role));
  } catch (err) {
    console.error('PUT /api/payments/[id] error:', err);
    return serverError('Failed to update payment');
  }
}

export async function DELETE(req: NextRequest, context: Params) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId, userId } = ctx;
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid ID');

    // Verify ownership/scoping
    const existingPayment = await db.select().from(payments)
      .where(and(eq(payments.id, id), eq(payments.companyId, companyId), eq(payments.fiscalYearId, fiscalYearId)))
      .limit(1);
    if (existingPayment.length === 0) return notFound('Payment not found or does not belong to active company/fiscal year');

    await db.transaction(async (tx) => {
      // Get allocations to restore bill balances
      const allocs = await tx.select().from(paymentAllocations).where(eq(paymentAllocations.paymentId, id));
      for (const alloc of allocs) {
        const [billRecord] = await tx.select().from(bills).where(eq(bills.id, alloc.billId)).limit(1);
        if (billRecord) {
          const currentBalance = Number(billRecord.balanceAmount || 0);
          const newBalance = currentBalance + Number(alloc.allocatedAmount);
          await tx.update(bills).set({ balanceAmount: newBalance.toString() }).where(eq(bills.id, alloc.billId));
        }
      }

      // Delete corresponding ledger entries
      await tx.delete(ledger).where(and(eq(ledger.sourceType, 'PAYMENT'), eq(ledger.sourceId, id)));

      // Delete payment (allocations cascade deleted)
      await tx.delete(payments).where(eq(payments.id, id));
    });

    writeAuditLog({
      userId,
      companyId,
      action: 'DELETE',
      entityType: 'payment',
      entityId: id,
    });

    cacheInvalidate('payments');
    cacheInvalidate('bills');
    cacheInvalidate('ledger');
    cacheInvalidate(`payments:${id}`);
    cacheInvalidate('dashboard');
    triggerBackgroundWarmup(companyId, fiscalYearId);
    return ok({ success: true, id });
  } catch (err) {
    console.error('DELETE /api/payments/[id] error:', err);
    return serverError('Failed to delete payment');
  }
}
