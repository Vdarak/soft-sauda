/**
 * API Middleware — Composable middleware for multi-company, RBAC, fiscal year scoping.
 *
 * Usage in API routes:
 *   const ctx = await getRequestContext(req);
 *   if (!ctx) return unauthorized();
 *   // ctx.userId, ctx.role, ctx.companyId, ctx.fiscalYearId, etc.
 */

import { NextRequest } from 'next/server';
import { verifyToken, unauthorized, forbidden } from '@/lib/api-helpers';
import { db } from '@/db';
import { users, userCompanyAccess, auditLog, companies, fiscalYears } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

/** Full request context extracted from JWT + headers */
export interface RequestContext {
  userId: number;
  username: string;
  role: 'ADMIN' | 'EMPLOYEE';
  displayName: string;
  permissions: Record<string, Record<string, boolean>>;
  companyId: number;
  companyName: string;
  fiscalYearId: number;
  fiscalYearLabel: string;
}

/**
 * Extract the full request context from a request.
 * Returns null if auth fails or context is incomplete.
 */
export async function getRequestContext(req: NextRequest): Promise<RequestContext | null> {
  // 1. Verify JWT
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const payload = await verifyToken(token);
  if (!payload || !payload.uid) return null;

  const userId = payload.uid as number;
  const role = (payload.role as string) || 'EMPLOYEE';
  const username = (payload.sub as string) || '';
  const displayName = (payload.displayName as string) || username;

  // 2. Fetch user permissions from DB
  const [user] = await db.select({
    permissions: users.permissions,
    isActive: users.isActive,
  }).from(users).where(eq(users.id, userId)).limit(1);

  if (!user || !user.isActive) return null;

  const permissions = (user.permissions || {}) as Record<string, Record<string, boolean>>;

  // 3. Extract company context from headers
  const companyIdHeader = req.headers.get('x-company-id');
  const fiscalYearIdHeader = req.headers.get('x-fiscal-year-id');

  if (!companyIdHeader) return null;
  const companyId = parseInt(companyIdHeader, 10);
  if (isNaN(companyId)) return null;

  // 4. Verify company access
  if (role !== 'ADMIN') {
    const access = await db.select()
      .from(userCompanyAccess)
      .where(and(eq(userCompanyAccess.userId, userId), eq(userCompanyAccess.companyId, companyId)))
      .limit(1);
    if (access.length === 0) return null;
  }

  // 5. Get company name
  const [company] = await db.select({ name: companies.name })
    .from(companies).where(eq(companies.id, companyId)).limit(1);
  if (!company) return null;

  // 6. Resolve fiscal year
  let fiscalYearId: number;
  let fiscalYearLabel: string;

  if (fiscalYearIdHeader) {
    fiscalYearId = parseInt(fiscalYearIdHeader, 10);
    const [fy] = await db.select({ label: fiscalYears.label })
      .from(fiscalYears).where(eq(fiscalYears.id, fiscalYearId)).limit(1);
    fiscalYearLabel = fy?.label || 'Unknown';
  } else {
    // Default to current FY for this company
    const [fy] = await db.select({ id: fiscalYears.id, label: fiscalYears.label })
      .from(fiscalYears)
      .where(and(eq(fiscalYears.companyId, companyId), eq(fiscalYears.isCurrent, true)))
      .limit(1);
    if (!fy) return null;
    fiscalYearId = fy.id;
    fiscalYearLabel = fy.label;
  }

  return {
    userId,
    username,
    role: role as 'ADMIN' | 'EMPLOYEE',
    displayName,
    permissions,
    companyId,
    companyName: company.name,
    fiscalYearId,
    fiscalYearLabel,
  };
}

/**
 * Check if a user has permission for a specific action on an entity.
 * Returns true if allowed.
 */
export function hasPermission(ctx: RequestContext, entity: string, action: string): boolean {
  if (ctx.role === 'ADMIN') return true;
  const entityPerms = ctx.permissions[entity];
  if (!entityPerms) return true; // Default: allow if not explicitly restricted
  return entityPerms[action] !== false;
}

/**
 * Strip audit metadata fields from response data for non-admin users.
 * Removes: createdBy, updatedBy, createdAt, updatedAt
 */
export function stripAuditFields(data: any, role: string): any {
  if (role === 'ADMIN') return data;

  const AUDIT_FIELDS = [
    'createdBy', 'updatedBy', 'createdAt', 'updatedAt', 
    'created_by', 'updated_by', 'created_at', 'updated_at',
    'createdByUsername', 'createdByDisplayName', 
    'updatedByUsername', 'updatedByDisplayName'
  ];

  if (Array.isArray(data)) {
    return data.map(item => stripAuditFields(item, role));
  }

  if (data && typeof data === 'object') {
    const cleaned = { ...data };
    for (const field of AUDIT_FIELDS) {
      delete cleaned[field];
    }
    return cleaned;
  }

  return data;
}

/**
 * Write an audit log entry (fire-and-forget).
 */
export async function writeAuditLog(params: {
  userId: number;
  companyId: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: string;
  entityId?: number;
  changes?: Record<string, any>;
  ipAddress?: string;
}): Promise<void> {
  try {
    await db.insert(auditLog).values({
      userId: params.userId,
      companyId: params.companyId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId || null,
      changes: params.changes || null,
      ipAddress: params.ipAddress || null,
    });
  } catch (err) {
    console.error('[AuditLog] Failed to write:', err);
  }
}

/**
 * Lightweight context for routes that don't need company/FY (e.g., /companies, /fiscal-years).
 * Only verifies JWT and returns user info.
 */
export async function getAuthContext(req: NextRequest): Promise<{
  userId: number;
  username: string;
  role: 'ADMIN' | 'EMPLOYEE';
  displayName: string;
  permissions: Record<string, Record<string, boolean>>;
} | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const payload = await verifyToken(token);
  if (!payload || !payload.uid) return null;

  const userId = payload.uid as number;
  const [user] = await db.select({
    permissions: users.permissions,
    isActive: users.isActive,
    role: users.role,
    displayName: users.displayName,
    username: users.username,
  }).from(users).where(eq(users.id, userId)).limit(1);

  if (!user || !user.isActive) return null;

  return {
    userId,
    username: user.username,
    role: user.role as 'ADMIN' | 'EMPLOYEE',
    displayName: user.displayName || user.username,
    permissions: (user.permissions || {}) as Record<string, Record<string, boolean>>,
  };
}
