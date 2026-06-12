/**
 * POST /api/auth/login
 * 
 * Authenticates against the `users` table (not env vars).
 * Returns JWT with uid, role, displayName + list of accessible companies + fiscal years.
 * 
 * After a successful login, fires a background cache warmup.
 */

import { NextRequest } from 'next/server';
import { ok, badRequest, unauthorized, createToken, verifyPassword, parseBody } from '@/lib/api-helpers';
import { db } from '@/db';
import { users, userCompanyAccess, companies, fiscalYears } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

interface LoginBody {
  username: string;
  password: string;
}

export async function POST(req: NextRequest) {
  const body = await parseBody<LoginBody>(req);
  if (!body || !body.username || !body.password) {
    return badRequest('Username and password are required');
  }

  // 1. Find user in DB
  const [user] = await db.select()
    .from(users)
    .where(eq(users.username, body.username.trim()))
    .limit(1);

  if (!user || !user.isActive) {
    return unauthorized('Invalid credentials');
  }

  // 2. Verify password
  if (!verifyPassword(body.password, user.passwordHash)) {
    return unauthorized('Invalid credentials');
  }

  // 3. Update last_login
  await db.update(users)
    .set({ lastLogin: new Date() })
    .where(eq(users.id, user.id));

  // 4. Create JWT with full context
  const token = await createToken({
    username: user.username,
    uid: user.id,
    role: user.role,
    displayName: user.displayName || user.username,
  });

  // 5. Fetch accessible companies with their fiscal years
  let accessibleCompanyIds: number[] = [];

  if (user.role === 'ADMIN') {
    // Admin gets all companies
    const allCompanies = await db.select({ id: companies.id }).from(companies);
    accessibleCompanyIds = allCompanies.map(c => c.id);
  } else {
    // Employee gets only granted companies
    const access = await db.select({ companyId: userCompanyAccess.companyId })
      .from(userCompanyAccess)
      .where(eq(userCompanyAccess.userId, user.id));
    accessibleCompanyIds = access.map(a => a.companyId);
  }

  // 6. Fetch company details + their fiscal years
  const companyList = [];
  for (const compId of accessibleCompanyIds) {
    const [comp] = await db.select()
      .from(companies)
      .where(eq(companies.id, compId))
      .limit(1);

    if (!comp || !comp.isActive) continue;

    const fys = await db.select()
      .from(fiscalYears)
      .where(eq(fiscalYears.companyId, compId))
      .orderBy(fiscalYears.startDate);

    companyList.push({
      id: comp.id,
      name: comp.name,
      shortCode: comp.shortCode,
      description: comp.description,
      fiscalYears: fys.map(fy => ({
        id: fy.id,
        label: fy.label,
        startDate: fy.startDate,
        endDate: fy.endDate,
        isCurrent: fy.isCurrent,
        isLocked: fy.isLocked,
      })),
      currentFiscalYear: fys.find(fy => fy.isCurrent) ? {
        id: fys.find(fy => fy.isCurrent)!.id,
        label: fys.find(fy => fy.isCurrent)!.label,
      } : null,
    });
  }

  return ok({
    token,
    username: user.username,
    displayName: user.displayName || user.username,
    role: user.role,
    permissions: user.permissions,
    companies: companyList,
    expiresIn: parseInt(process.env.AUTH_SESSION_MAX_AGE_SECONDS || '86400', 10),
  });
}
