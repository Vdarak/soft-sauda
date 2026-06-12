/**
 * GET  /api/ledger  — List ledger entries with account names (company+FY scoped)
 * POST /api/ledger  — Create manual journal entry
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { ledger, parties } from '@/db/schema';
import { desc, eq, and, or, ilike } from 'drizzle-orm';
import { ok, created, badRequest, serverError, parseBody, unauthorized } from '@/lib/api-helpers';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/cache';
import { getRequestContext, stripAuditFields, writeAuditLog } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId } = ctx;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const accountId = searchParams.get('accountId');
    const offset = (page - 1) * limit;

    const scopeConditions = [
      eq(ledger.companyId, companyId),
      eq(ledger.fiscalYearId, fiscalYearId),
    ];

    const q = searchParams.get('q');

    // ── Search Mode ──
    if (q) {
      const searchPattern = `%${q}%`;
      const data = await db.select({
        id: ledger.id,
        transactionDate: ledger.transactionDate,
        accountId: ledger.accountId,
        sourceType: ledger.sourceType,
        sourceId: ledger.sourceId,
        debit: ledger.debit,
        credit: ledger.credit,
        narration: ledger.narration,
        createdAt: ledger.createdAt,
        updatedAt: ledger.updatedAt,
        createdBy: ledger.createdBy,
        updatedBy: ledger.updatedBy,
        accountName: parties.name,
      })
        .from(ledger)
        .leftJoin(parties, eq(parties.id, ledger.accountId))
        .where(
          and(
            ...scopeConditions,
            or(
              ilike(parties.name, searchPattern),
              ilike(ledger.narration, searchPattern)
            )
          )
        )
        .orderBy(desc(ledger.id))
        .limit(100);
      return ok(stripAuditFields(data, ctx.role));
    }

    // ── Standard Paginated Mode ──
    const cacheKey = `ledger:list:${companyId}:${fiscalYearId}:${page}:${limit}:${accountId || 'all'}`;
    const cached = cacheGet<unknown[]>(cacheKey);
    if (cached) return ok(stripAuditFields(cached, ctx.role));

    const finalScope = [...scopeConditions];
    if (accountId) {
      finalScope.push(eq(ledger.accountId, parseInt(accountId, 10)));
    }

    const data = await db.select({
      id: ledger.id,
      transactionDate: ledger.transactionDate,
      accountId: ledger.accountId,
      sourceType: ledger.sourceType,
      sourceId: ledger.sourceId,
      debit: ledger.debit,
      credit: ledger.credit,
      narration: ledger.narration,
      createdAt: ledger.createdAt,
      updatedAt: ledger.updatedAt,
      createdBy: ledger.createdBy,
      updatedBy: ledger.updatedBy,
      accountName: parties.name,
    })
      .from(ledger)
      .leftJoin(parties, eq(parties.id, ledger.accountId))
      .where(and(...finalScope))
      .orderBy(desc(ledger.id))
      .limit(limit)
      .offset(offset);

    cacheSet(cacheKey, data, 30);
    return ok(stripAuditFields(data, ctx.role));
  } catch (err) {
    console.error('GET /api/ledger error:', err);
    return serverError('Failed to fetch ledger');
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId, userId } = ctx;
    const body = await parseBody<Record<string, any>>(req);
    if (!body || !body.accountId) return badRequest('Account ID is required');

    const debit = parseFloat(body.debit || '0');
    const credit = parseFloat(body.credit || '0');

    if (debit <= 0 && credit <= 0) return badRequest('At least one positive amount is required');

    const [entry] = await db.insert(ledger).values({
      companyId,
      fiscalYearId,
      transactionDate: body.transactionDate ? new Date(body.transactionDate) : new Date(),
      accountId: parseInt(body.accountId, 10),
      sourceType: 'MANUAL',
      sourceId: body.voucherRef ? parseInt(body.voucherRef, 10) : null,
      narration: body.narration || null,
      debit: debit > 0 ? debit.toString() : '0.00',
      credit: credit > 0 ? credit.toString() : '0.00',
      createdBy: userId,
      updatedBy: userId,
    }).returning();

    writeAuditLog({
      userId,
      companyId,
      action: 'CREATE',
      entityType: 'ledger',
      entityId: entry.id,
      changes: { accountId: body.accountId, debit: entry.debit, credit: entry.credit },
    });

    cacheInvalidate('ledger');
    return created(stripAuditFields(entry, ctx.role));
  } catch (err) {
    console.error('POST /api/ledger error:', err);
    return serverError('Failed to create ledger entry');
  }
}
