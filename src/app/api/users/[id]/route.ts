import { NextRequest } from 'next/server';
import { db } from '@/db';
import { users, userCompanyAccess } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, badRequest, notFound, serverError, parseBody, unauthorized, forbidden, hashPassword } from '@/lib/api-helpers';
import { getAuthContext, writeAuditLog } from '@/lib/middleware';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: Params) {
  try {
    const authCtx = await getAuthContext(req);
    if (!authCtx) return unauthorized();
    if (authCtx.role !== 'ADMIN') return forbidden('Only admins can access user management');

    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid user ID');

    const [user] = await db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, id)).limit(1);

    if (!user) return notFound('User not found');

    const access = await db.select({
      companyId: userCompanyAccess.companyId,
    }).from(userCompanyAccess).where(eq(userCompanyAccess.userId, id));

    return ok({
      ...user,
      companyIds: access.map(a => a.companyId),
    });
  } catch (err) {
    console.error('GET /api/users/[id] error:', err);
    return serverError('Failed to fetch user');
  }
}

export async function PUT(req: NextRequest, context: Params) {
  try {
    const authCtx = await getAuthContext(req);
    if (!authCtx) return unauthorized();
    if (authCtx.role !== 'ADMIN') return forbidden('Only admins can access user management');

    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid user ID');

    const body = await parseBody<any>(req);
    if (!body) return badRequest('Request body is required');

    // Find existing user
    const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) return notFound('User not found');

    const displayName = body.displayName?.trim() || existing.displayName;
    const role = body.role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE';
    const isActive = body.isActive !== false;

    // Build update object
    const updateValues: any = {
      displayName,
      role,
      isActive,
      updatedAt: new Date(),
    };

    if (body.password && body.password.trim() !== '') {
      updateValues.passwordHash = hashPassword(body.password);
    }

    await db.transaction(async (tx) => {
      // Update user
      await tx.update(users).set(updateValues).where(eq(users.id, id));

      // Reset company access
      await tx.delete(userCompanyAccess).where(eq(userCompanyAccess.userId, id));

      // Re-insert company access
      if (body.companyIds && Array.isArray(body.companyIds)) {
        for (const companyId of body.companyIds) {
          await tx.insert(userCompanyAccess).values({
            userId: id,
            companyId: parseInt(companyId, 10),
          });
        }
      }
    });

    writeAuditLog({
      userId: authCtx.userId,
      companyId: 0,
      action: 'UPDATE',
      entityType: 'user',
      entityId: id,
      changes: { role, displayName, isActive },
    });

    return ok({ success: true });
  } catch (err) {
    console.error('PUT /api/users/[id] error:', err);
    return serverError('Failed to update user');
  }
}

export async function DELETE(req: NextRequest, context: Params) {
  try {
    const authCtx = await getAuthContext(req);
    if (!authCtx) return unauthorized();
    if (authCtx.role !== 'ADMIN') return forbidden('Only admins can access user management');

    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid user ID');

    if (id === authCtx.userId) {
      return badRequest('You cannot delete your own admin user account');
    }

    const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) return notFound('User not found');

    await db.delete(users).where(eq(users.id, id));

    writeAuditLog({
      userId: authCtx.userId,
      companyId: 0,
      action: 'DELETE',
      entityType: 'user',
      entityId: id,
      changes: { username: existing.username },
    });

    return ok({ success: true });
  } catch (err) {
    console.error('DELETE /api/users/[id] error:', err);
    return serverError('Failed to delete user');
  }
}
