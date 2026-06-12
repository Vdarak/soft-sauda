/**
 * GET  /api/fiscal-years — List fiscal years for a company (X-Company-Id header)
 * POST /api/fiscal-years — Create new fiscal year (admin only)
 * PUT  /api/fiscal-years — Update fiscal year (lock/unlock, admin only)
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { fiscalYears } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { ok, created, badRequest, serverError, unauthorized, forbidden, parseBody } from '@/lib/api-helpers';
import { getAuthContext } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx) return unauthorized();

    const companyId = req.headers.get('x-company-id');
    if (!companyId) return badRequest('X-Company-Id header is required');

    const fys = await db.select()
      .from(fiscalYears)
      .where(eq(fiscalYears.companyId, parseInt(companyId, 10)))
      .orderBy(fiscalYears.startDate);

    return ok(fys);
  } catch (err) {
    console.error('GET /api/fiscal-years error:', err);
    return serverError('Failed to fetch fiscal years');
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx) return unauthorized();
    if (ctx.role !== 'ADMIN') return forbidden('Only admins can create fiscal years');

    const body = await parseBody<{
      companyId: number;
      label: string;
      startDate: string;
      endDate: string;
      isCurrent?: boolean;
    }>(req);

    if (!body?.companyId || !body?.label || !body?.startDate || !body?.endDate) {
      return badRequest('companyId, label, startDate, endDate are required');
    }

    // If setting this as current, unset others
    if (body.isCurrent) {
      await db.update(fiscalYears)
        .set({ isCurrent: false })
        .where(eq(fiscalYears.companyId, body.companyId));
    }

    const [result] = await db.insert(fiscalYears).values({
      companyId: body.companyId,
      label: body.label,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      isCurrent: body.isCurrent || false,
      isLocked: false,
    }).returning();

    return created(result);
  } catch (err) {
    console.error('POST /api/fiscal-years error:', err);
    return serverError('Failed to create fiscal year');
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx) return unauthorized();
    if (ctx.role !== 'ADMIN') return forbidden('Only admins can update fiscal years');

    const body = await parseBody<{
      id: number;
      isLocked?: boolean;
      isCurrent?: boolean;
    }>(req);

    if (!body?.id) return badRequest('Fiscal year ID is required');

    const updates: any = {};
    if (body.isLocked !== undefined) updates.isLocked = body.isLocked;
    if (body.isCurrent !== undefined) {
      updates.isCurrent = body.isCurrent;
      // If setting current, unset others for this company
      if (body.isCurrent) {
        const [fy] = await db.select({ companyId: fiscalYears.companyId })
          .from(fiscalYears).where(eq(fiscalYears.id, body.id)).limit(1);
        if (fy) {
          await db.update(fiscalYears)
            .set({ isCurrent: false })
            .where(eq(fiscalYears.companyId, fy.companyId));
        }
      }
    }

    const [result] = await db.update(fiscalYears)
      .set(updates)
      .where(eq(fiscalYears.id, body.id))
      .returning();

    return ok(result);
  } catch (err) {
    console.error('PUT /api/fiscal-years error:', err);
    return serverError('Failed to update fiscal year');
  }
}
