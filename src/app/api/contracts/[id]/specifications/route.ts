/**
 * /api/contracts/[id]/specifications
 * GET, POST, PUT, DELETE for contract specifications (saudaspec)
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { contracts, contractSpecifications } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { ok, badRequest, notFound, serverError, unauthorized, parseBody } from '@/lib/api-helpers';
import { getRequestContext } from '@/lib/middleware';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: Params) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId } = ctx;
    const { id: idStr } = await context.params;
    const contractId = parseInt(idStr, 10);
    if (isNaN(contractId)) return badRequest('Invalid contract ID');

    const [c] = await db.select({ id: contracts.id })
      .from(contracts)
      .where(and(eq(contracts.id, contractId), eq(contracts.companyId, companyId), eq(contracts.fiscalYearId, fiscalYearId)))
      .limit(1);
    if (!c) return notFound('Contract not found');

    const specs = await db.select()
      .from(contractSpecifications)
      .where(eq(contractSpecifications.contractId, contractId))
      .orderBy(contractSpecifications.id);

    return ok(specs);
  } catch (err) {
    console.error('GET /api/contracts/[id]/specifications error:', err);
    return serverError('Failed to fetch contract specifications');
  }
}

export async function POST(req: NextRequest, context: Params) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId } = ctx;
    const { id: idStr } = await context.params;
    const contractId = parseInt(idStr, 10);
    if (isNaN(contractId)) return badRequest('Invalid contract ID');

    const [c] = await db.select({ id: contracts.id })
      .from(contracts)
      .where(and(eq(contracts.id, contractId), eq(contracts.companyId, companyId), eq(contracts.fiscalYearId, fiscalYearId)))
      .limit(1);
    if (!c) return notFound('Contract not found');

    const body = await parseBody<{
      specName: string;
      specValue?: string | number | null;
      minMax?: string | null;
      remarks?: string | null;
    }>(req);
    if (!body || !body.specName?.trim()) return badRequest('Specification name is required');

    const [inserted] = await db.insert(contractSpecifications).values({
      contractId,
      specName: body.specName.trim(),
      specValue: body.specValue != null ? body.specValue.toString() : null,
      minMax: body.minMax ? body.minMax.trim() : null,
      remarks: body.remarks ? body.remarks.trim() : null,
    }).returning();

    return ok(inserted);
  } catch (err) {
    console.error('POST /api/contracts/[id]/specifications error:', err);
    return serverError('Failed to create contract specification');
  }
}

export async function PUT(req: NextRequest, context: Params) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId } = ctx;
    const { id: idStr } = await context.params;
    const contractId = parseInt(idStr, 10);
    if (isNaN(contractId)) return badRequest('Invalid contract ID');

    const [c] = await db.select({ id: contracts.id })
      .from(contracts)
      .where(and(eq(contracts.id, contractId), eq(contracts.companyId, companyId), eq(contracts.fiscalYearId, fiscalYearId)))
      .limit(1);
    if (!c) return notFound('Contract not found');

    const body = await parseBody<{
      specifications: Array<{
        id?: number;
        specName: string;
        specValue?: string | number | null;
        minMax?: string | null;
        remarks?: string | null;
      }>
    }>(req);
    if (!body || !Array.isArray(body.specifications)) return badRequest('Array of specifications required');

    await db.transaction(async (tx) => {
      await tx.delete(contractSpecifications).where(eq(contractSpecifications.contractId, contractId));
      if (body.specifications.length > 0) {
        const rows = body.specifications
          .filter(s => s.specName && s.specName.trim().length > 0)
          .map(s => ({
            contractId,
            specName: s.specName.trim(),
            specValue: s.specValue != null && s.specValue !== '' ? s.specValue.toString() : null,
            minMax: s.minMax ? s.minMax.trim() : null,
            remarks: s.remarks ? s.remarks.trim() : null,
          }));
        if (rows.length > 0) {
          await tx.insert(contractSpecifications).values(rows);
        }
      }
    });

    const updated = await db.select()
      .from(contractSpecifications)
      .where(eq(contractSpecifications.contractId, contractId))
      .orderBy(contractSpecifications.id);

    return ok(updated);
  } catch (err) {
    console.error('PUT /api/contracts/[id]/specifications error:', err);
    return serverError('Failed to update contract specifications');
  }
}

export async function DELETE(req: NextRequest, context: Params) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId } = ctx;
    const { id: idStr } = await context.params;
    const contractId = parseInt(idStr, 10);
    if (isNaN(contractId)) return badRequest('Invalid contract ID');

    const [c] = await db.select({ id: contracts.id })
      .from(contracts)
      .where(and(eq(contracts.id, contractId), eq(contracts.companyId, companyId), eq(contracts.fiscalYearId, fiscalYearId)))
      .limit(1);
    if (!c) return notFound('Contract not found');

    const { searchParams } = new URL(req.url);
    const specId = searchParams.get('specId');

    if (specId) {
      await db.delete(contractSpecifications)
        .where(and(eq(contractSpecifications.id, parseInt(specId, 10)), eq(contractSpecifications.contractId, contractId)));
    } else {
      await db.delete(contractSpecifications).where(eq(contractSpecifications.contractId, contractId));
    }

    return ok({ success: true });
  } catch (err) {
    console.error('DELETE /api/contracts/[id]/specifications error:', err);
    return serverError('Failed to delete contract specification(s)');
  }
}
