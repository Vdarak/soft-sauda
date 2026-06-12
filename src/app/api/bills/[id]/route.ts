/**
 * GET /api/bills/:id — Get bill with lines (company+FY scoped)
 * PUT /api/bills/:id — Update bill (with allocation guard)
 * DELETE /api/bills/:id — Delete bill
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { bills, billLines, parties, paymentAllocations, users } from '@/db/schema';
import { eq, and, aliasedTable } from 'drizzle-orm';
import { ok, badRequest, notFound, serverError, parseBody, unauthorized } from '@/lib/api-helpers';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/cache';
import { getRequestContext, stripAuditFields, writeAuditLog } from '@/lib/middleware';

type Params = { params: Promise<{ id: string }> };

async function resolveParty(name: string | null | undefined, tx?: any): Promise<number | null> {
  if (!name?.trim()) return null;
  const clean = name.trim();
  const dbCtx = tx || db;
  const existing = await dbCtx.select({ id: parties.id }).from(parties).where(eq(parties.name, clean)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const [inserted] = await dbCtx.insert(parties).values({ name: clean }).returning({ id: parties.id });
  return inserted.id;
}

export async function GET(req: NextRequest, context: Params) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId, role } = ctx;
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid bill ID');

    const cacheKey = `bills:${id}`;
    const cached = cacheGet(cacheKey);
    if (cached) return ok(stripAuditFields(cached, role));

    const creator = aliasedTable(users, 'creator');
    const updater = aliasedTable(users, 'updater');

    const billRows = await db.select({
      bill: bills,
      createdByUsername: creator.username,
      createdByDisplayName: creator.displayName,
      updatedByUsername: updater.username,
      updatedByDisplayName: updater.displayName,
    })
      .from(bills)
      .leftJoin(creator, eq(bills.createdBy, creator.id))
      .leftJoin(updater, eq(bills.updatedBy, updater.id))
      .where(and(eq(bills.id, id), eq(bills.companyId, companyId), eq(bills.fiscalYearId, fiscalYearId)))
      .limit(1);

    if (billRows.length === 0) return notFound('Bill not found');

    const billData = billRows[0].bill;
    const lines = await db.select().from(billLines).where(eq(billLines.billId, id));
    const party = await db.select({ name: parties.name }).from(parties).where(eq(parties.id, billData.partyId)).limit(1);

    const result = {
      ...billData,
      partyName: party[0]?.name || 'Unknown',
      lines,
      createdByUsername: billRows[0].createdByUsername,
      createdByDisplayName: billRows[0].createdByDisplayName,
      updatedByUsername: billRows[0].updatedByUsername,
      updatedByDisplayName: billRows[0].updatedByDisplayName,
    };
    cacheSet(cacheKey, result, 60);
    return ok(stripAuditFields(result, role));
  } catch (err) {
    console.error('GET /api/bills/[id] error:', err);
    return serverError('Failed to fetch bill');
  }
}

export async function PUT(req: NextRequest, context: Params) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId, userId, role } = ctx;
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid bill ID');

    const body = await parseBody<Record<string, any>>(req);
    if (!body || !body.billNo) return badRequest('Bill number is required');

    // Verify ownership/scoping before update
    const existingBill = await db.select().from(bills)
      .where(and(eq(bills.id, id), eq(bills.companyId, companyId), eq(bills.fiscalYearId, fiscalYearId)))
      .limit(1);
    if (existingBill.length === 0) return notFound('Bill not found or does not belong to active company/fiscal year');

    const partyId = await resolveParty(body.partyName);
    if (!partyId) return badRequest('A valid party is required');

    const totalAmount = parseFloat(body.totalAmount || '0');
    if (totalAmount <= 0) return badRequest('Bill amount must be greater than zero');

    // Check if bill has payment allocations
    const allocations = await db.select({ id: paymentAllocations.id }).from(paymentAllocations).where(eq(paymentAllocations.billId, id)).limit(1);
    const hasAllocations = allocations.length > 0;

    if (hasAllocations) {
      if (existingBill[0].partyId !== partyId || Number(existingBill[0].totalAmount) !== totalAmount) {
        return badRequest('Bill is already allocated in payments. Only header text/date edits are allowed.');
      }
    }

    await db.transaction(async (tx) => {
      const basis = body.basis || 'DIRECT';
      const newBalance = hasAllocations ? existingBill[0].balanceAmount : totalAmount.toString();

      await tx.update(bills).set({
        billNo: body.billNo,
        billDate: body.billDate ? new Date(body.billDate) : new Date(),
        partyId,
        basis,
        totalAmount: totalAmount.toString(),
        balanceAmount: newBalance,
        creditDays: body.creditDays ? parseInt(body.creditDays, 10) : null,
        updatedAt: new Date(),
        updatedBy: userId,
      }).where(eq(bills.id, id));

      const description = body.description || `Bill against ${basis}`;
      const firstLine = await tx.select().from(billLines).where(eq(billLines.billId, id)).limit(1);
      if (firstLine.length > 0) {
        await tx.update(billLines).set({
          description,
          amount: totalAmount.toString(),
          referenceType: basis,
          referenceId: body.referenceId ? parseInt(body.referenceId, 10) : null,
        }).where(eq(billLines.id, firstLine[0].id));
      } else {
        await tx.insert(billLines).values({
          billId: id,
          description,
          amount: totalAmount.toString(),
          referenceType: basis,
          referenceId: body.referenceId ? parseInt(body.referenceId, 10) : null,
        });
      }
    });

    writeAuditLog({
      userId,
      companyId,
      action: 'UPDATE',
      entityType: 'bill',
      entityId: id,
      changes: { billNo: body.billNo, totalAmount: body.totalAmount },
    });

    cacheInvalidate('bills');
    const updated = await db.select().from(bills).where(eq(bills.id, id)).limit(1);
    return ok(stripAuditFields(updated[0], role));
  } catch (err) {
    console.error('PUT /api/bills/[id] error:', err);
    return serverError('Failed to update bill');
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
    const existingBill = await db.select().from(bills)
      .where(and(eq(bills.id, id), eq(bills.companyId, companyId), eq(bills.fiscalYearId, fiscalYearId)))
      .limit(1);
    if (existingBill.length === 0) return notFound('Bill not found or does not belong to active company/fiscal year');

    await db.delete(bills).where(eq(bills.id, id));

    writeAuditLog({
      userId,
      companyId,
      action: 'DELETE',
      entityType: 'bill',
      entityId: id,
    });

    cacheInvalidate('bills');
    cacheInvalidate('dashboard');
    return ok({ success: true, id });
  } catch (err: any) {
    console.error('DELETE /api/bills/[id] error:', err);
    if (err.code === '23503') {
      return badRequest('Cannot delete bill: payments have already been allocated to it. Please remove the payment allocations first.');
    }
    return serverError('Failed to delete');
  }
}
