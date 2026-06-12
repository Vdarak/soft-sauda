/**
 * GET  /api/bills  — List bills with party names (company+FY scoped)
 * POST /api/bills  — Create bill + ledger posting
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { bills, billLines, ledger, parties } from '@/db/schema';
import { desc, eq, and, or, ilike } from 'drizzle-orm';
import { ok, created, badRequest, serverError, parseBody, unauthorized } from '@/lib/api-helpers';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/cache';
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
      eq(bills.companyId, companyId),
      eq(bills.fiscalYearId, fiscalYearId),
    ];

    // ── Search Mode ──
    if (q) {
      const searchPattern = `%${q}%`;
      const data = await db.select({
        id: bills.id,
        billNo: bills.billNo,
        billDate: bills.billDate,
        partyId: bills.partyId,
        basis: bills.basis,
        totalAmount: bills.totalAmount,
        balanceAmount: bills.balanceAmount,
        creditDays: bills.creditDays,
        createdAt: bills.createdAt,
        updatedAt: bills.updatedAt,
        createdBy: bills.createdBy,
        updatedBy: bills.updatedBy,
        partyName: parties.name,
      })
        .from(bills)
        .leftJoin(parties, eq(parties.id, bills.partyId))
        .where(
          and(
            ...scopeConditions,
            or(
              ilike(bills.billNo, searchPattern),
              ilike(parties.name, searchPattern)
            )
          )
        )
        .orderBy(desc(bills.id))
        .limit(100);
      return ok(stripAuditFields(data, ctx.role));
    }

    // ── Standard Paginated Mode ──
    const cacheKey = `bills:list:${companyId}:${fiscalYearId}:${page}:${limit}`;
    const cached = cacheGet<unknown[]>(cacheKey);
    if (cached) return ok(stripAuditFields(cached, ctx.role));

    const data = await db.select({
      id: bills.id,
      billNo: bills.billNo,
      billDate: bills.billDate,
      partyId: bills.partyId,
      basis: bills.basis,
      totalAmount: bills.totalAmount,
      balanceAmount: bills.balanceAmount,
      creditDays: bills.creditDays,
      createdAt: bills.createdAt,
      updatedAt: bills.updatedAt,
      createdBy: bills.createdBy,
      updatedBy: bills.updatedBy,
      partyName: parties.name,
    })
      .from(bills)
      .leftJoin(parties, eq(parties.id, bills.partyId))
      .where(and(...scopeConditions))
      .orderBy(desc(bills.id))
      .limit(limit)
      .offset(offset);

    cacheSet(cacheKey, data, 30);
    return ok(stripAuditFields(data, ctx.role));
  } catch (err) {
    console.error('GET /api/bills error:', err);
    return serverError('Failed to fetch bills');
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId, userId } = ctx;
    const body = await parseBody<Record<string, any>>(req);
    if (!body || !body.billNo) return badRequest('Bill number is required');
    if (!body.partyName) return badRequest('Party name is required');

    let result: any;
    await db.transaction(async (tx) => {
      const partyId = await resolveParty(body.partyName, tx);
      if (!partyId) throw new Error('A valid party is required');

      const totalAmount = parseFloat(body.totalAmount || '0');
      if (totalAmount <= 0) throw new Error('Bill amount must be greater than zero');

      const billDate = body.billDate ? new Date(body.billDate) : new Date();
      const basis = body.basis || 'DIRECT';

      const [bill] = await tx.insert(bills).values({
        companyId,
        fiscalYearId,
        billNo: body.billNo,
        billDate,
        partyId,
        basis,
        totalAmount: totalAmount.toString(),
        balanceAmount: totalAmount.toString(),
        creditDays: body.creditDays ? parseInt(body.creditDays, 10) : null,
        createdBy: userId,
        updatedBy: userId,
      }).returning();

      // Create bill line item
      await tx.insert(billLines).values({
        billId: bill.id,
        description: body.description || `Bill against ${basis}`,
        amount: totalAmount.toString(),
        referenceType: basis,
        referenceId: body.referenceId ? parseInt(body.referenceId, 10) : null,
      });

      // Post to ledger (Debit the party's account)
      await tx.insert(ledger).values({
        companyId,
        fiscalYearId,
        transactionDate: billDate,
        accountId: partyId,
        sourceType: 'BILL',
        sourceId: bill.id,
        debit: totalAmount.toString(),
        credit: '0.00',
        narration: `Bill Generated: #${body.billNo} (${basis})`,
        createdBy: userId,
        updatedBy: userId,
      });

      result = bill;
    });

    writeAuditLog({
      userId,
      companyId,
      action: 'CREATE',
      entityType: 'bill',
      entityId: result.id,
      changes: { billNo: body.billNo, totalAmount: body.totalAmount },
    });

    cacheInvalidate('bills');
    cacheInvalidate('ledger');
    cacheInvalidate('dashboard');
    return created(result);
  } catch (err: any) {
    console.error('POST /api/bills error:', err);
    if (err.message?.includes('unique')) return badRequest('A bill with this number already exists');
    return badRequest(err.message || 'Failed to create bill');
  }
}
