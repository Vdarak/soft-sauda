/**
 * GET /api/auth/me — Returns current user info from JWT + accessible companies
 */

import { NextRequest } from 'next/server';
import { ok, unauthorized } from '@/lib/api-helpers';
import { getAuthContext } from '@/lib/middleware';
import { db } from '@/db';
import { companies, userCompanyAccess, fiscalYears } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return unauthorized();

  // Fetch accessible companies
  let companyList;
  if (ctx.role === 'ADMIN') {
    companyList = await db.select().from(companies).where(eq(companies.isActive, true)).orderBy(companies.id);
  } else {
    const access = await db.select({ companyId: userCompanyAccess.companyId })
      .from(userCompanyAccess)
      .where(eq(userCompanyAccess.userId, ctx.userId));
    const compIds = access.map(a => a.companyId);
    companyList = compIds.length > 0
      ? (await db.select().from(companies).where(eq(companies.isActive, true)).orderBy(companies.id))
          .filter(c => compIds.includes(c.id))
      : [];
  }

  // Enrich with FYs
  const enriched = [];
  for (const comp of companyList) {
    const fys = await db.select()
      .from(fiscalYears)
      .where(eq(fiscalYears.companyId, comp.id))
      .orderBy(fiscalYears.startDate);
    enriched.push({
      ...comp,
      fiscalYears: fys,
      currentFiscalYear: fys.find(fy => fy.isCurrent) || fys[fys.length - 1],
    });
  }

  return ok({
    userId: ctx.userId,
    username: ctx.username,
    displayName: ctx.displayName,
    role: ctx.role,
    permissions: ctx.permissions,
    companies: enriched,
  });
}
