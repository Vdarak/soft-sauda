/**
 * GET /api/bills/:id — Get bill with lines
 * PUT /api/bills/:id — Update bill (with allocation guard)
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { bills, billLines, parties, paymentAllocations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, badRequest, notFound, serverError, parseBody } from '@/lib/api-helpers';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/cache';

type Params = { params: Promise<{ id: string }> };

async function resolveParty(name: string | null | undefined): Promise<number | null> {
  if (!name?.trim()) return null;
  const clean = name.trim();
  const existing = await db.select({ id: parties.id }).from(parties).where(eq(parties.name, clean)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const [inserted] = await db.insert(parties).values({ name: clean }).returning({ id: parties.id });
  return inserted.id;
}

export async function GET(req: NextRequest, context: Params) {
  try {
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid bill ID');

    const cacheKey = `bills:${id}`;
    const cached = cacheGet(cacheKey);
    if (cached) return ok(cached);

    const bill = await db.select().from(bills).where(eq(bills.id, id)).limit(1);
    if (bill.length === 0) return notFound('Bill not found');

    const lines = await db.select().from(billLines).where(eq(billLines.billId, id));
    const party = await db.select({ name: parties.name }).from(parties).where(eq(parties.id, bill[0].partyId)).limit(1);

    const result = { ...bill[0], partyName: party[0]?.name || 'Unknown', lines };
    cacheSet(cacheKey, result, 60);
    return ok(result);
  } catch (err) {
    console.error('GET /api/bills/[id] error:', err);
    return serverError('Failed to fetch bill');
  }
}

export async function PUT(req: NextRequest, context: Params) {
  try {
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid bill ID');

    const body = await parseBody<Record<string, any>>(req);
    if (!body || !body.billNo) return badRequest('Bill number is required');

    const partyId = await resolveParty(body.partyName);
    if (!partyId) return badRequest('A valid party is required');

    const totalAmount = parseFloat(body.totalAmount || '0');
    if (totalAmount <= 0) return badRequest('Bill amount must be greater than zero');

    const existingBill = await db.select().from(bills).where(eq(bills.id, id)).limit(1);
    if (existingBill.length === 0) return notFound('Bill not found');

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
      }).where(eq(bills.id, id));

      const description = body.description || `Bill against ${basis}`;
      const firstLine = await tx.select().from(billLines).where(eq(billLines.billId, id)).limit(1);
      if (firstLine.length > 0) {
        await tx.update(billLines).set({ description, amount: totalAmount.toString(), referenceType: basis }).where(eq(billLines.id, firstLine[0].id));
      } else {
        await tx.insert(billLines).values({ billId: id, description, amount: totalAmount.toString(), referenceType: basis });
      }
    });

    cacheInvalidate('bills');
    const updated = await db.select().from(bills).where(eq(bills.id, id)).limit(1);
    return ok(updated[0]);
  } catch (err) {
    console.error('PUT /api/bills/[id] error:', err);
    return serverError('Failed to update bill');
  }
}

export async function DELETE(req: NextRequest, context: Params) {
  try {
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid ID');
    await db.delete(bills).where(eq(bills.id, id));
    cacheInvalidate('bills');
    return ok({ success: true, id });
  } catch (err) {
    console.error('DELETE /api/bills/[id] error:', err);
    return serverError('Failed to delete');
  }
}
