/**
 * GET  /api/companies — List all companies (accessible to the user)
 * POST /api/companies — Create new company (admin only)
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { companies, fiscalYears, userCompanyAccess } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, created, badRequest, serverError, unauthorized, forbidden, parseBody } from '@/lib/api-helpers';
import { getAuthContext } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx) return unauthorized();

    let companyList;
    if (ctx.role === 'ADMIN') {
      companyList = await db.select().from(companies).orderBy(companies.id);
    } else {
      const access = await db.select({ companyId: userCompanyAccess.companyId })
        .from(userCompanyAccess)
        .where(eq(userCompanyAccess.userId, ctx.userId));
      const compIds = access.map(a => a.companyId);
      if (compIds.length === 0) return ok([]);
      companyList = await db.select().from(companies)
        .where(eq(companies.isActive, true))
        .orderBy(companies.id);
      companyList = companyList.filter(c => compIds.includes(c.id));
    }

    // Enrich with fiscal years
    const enriched = [];
    for (const comp of companyList) {
      const fys = await db.select()
        .from(fiscalYears)
        .where(eq(fiscalYears.companyId, comp.id))
        .orderBy(fiscalYears.startDate);
      enriched.push({
        ...comp,
        fiscalYears: fys,
        currentFiscalYear: fys.find(fy => fy.isCurrent) || fys[fys.length - 1] || null,
      });
    }

    return ok(enriched);
  } catch (err) {
    console.error('GET /api/companies error:', err);
    return serverError('Failed to fetch companies');
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx) return unauthorized();
    if (ctx.role !== 'ADMIN') return forbidden('Only admins can create companies');

    const body = await parseBody<{ name: string; shortCode: string; description?: string }>(req);
    if (!body?.name || !body?.shortCode) return badRequest('Name and short code are required');

    const [result] = await db.insert(companies).values({
      name: body.name.trim(),
      shortCode: body.shortCode.trim().toUpperCase(),
      description: body.description || null,
    }).returning();

    return created(result);
  } catch (err) {
    console.error('POST /api/companies error:', err);
    return serverError('Failed to create company');
  }
}
