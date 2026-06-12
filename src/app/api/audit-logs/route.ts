import { NextRequest } from 'next/server';
import { db } from '@/db';
import { auditLog, users, companies } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { ok, unauthorized, forbidden, serverError } from '@/lib/api-helpers';
import { getAuthContext } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authCtx = await getAuthContext(req);
    if (!authCtx) return unauthorized();
    if (authCtx.role !== 'ADMIN') return forbidden('Only admins can view audit logs');

    const logs = await db.select({
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      changes: auditLog.changes,
      ipAddress: auditLog.ipAddress,
      createdAt: auditLog.createdAt,
      username: users.username,
      displayName: users.displayName,
      companyName: companies.name,
    })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.userId, users.id))
      .leftJoin(companies, eq(auditLog.companyId, companies.id))
      .orderBy(desc(auditLog.id))
      .limit(200);

    return ok(logs);
  } catch (err) {
    console.error('GET /api/audit-logs error:', err);
    return serverError('Failed to fetch audit logs');
  }
}
