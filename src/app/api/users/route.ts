import { NextRequest } from 'next/server';
import { db } from '@/db';
import { users, userCompanyAccess } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, badRequest, serverError, parseBody, unauthorized, forbidden, created, hashPassword } from '@/lib/api-helpers';
import { getAuthContext, writeAuditLog } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authCtx = await getAuthContext(req);
    if (!authCtx) return unauthorized();
    if (authCtx.role !== 'ADMIN') return forbidden('Only admins can access user management');

    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      isActive: users.isActive,
      lastLogin: users.lastLogin,
      createdAt: users.createdAt,
    }).from(users).orderBy(users.username);

    // Fetch company access mappings for each user
    const usersWithAccess = [];
    for (const u of allUsers) {
      const access = await db.select({
        companyId: userCompanyAccess.companyId,
      }).from(userCompanyAccess).where(eq(userCompanyAccess.userId, u.id));
      
      usersWithAccess.push({
        ...u,
        companyIds: access.map(a => a.companyId),
      });
    }

    return ok(usersWithAccess);
  } catch (err) {
    console.error('GET /api/users error:', err);
    return serverError('Failed to fetch users');
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCtx = await getAuthContext(req);
    if (!authCtx) return unauthorized();
    if (authCtx.role !== 'ADMIN') return forbidden('Only admins can access user management');

    const body = await parseBody<any>(req);
    if (!body || !body.username || !body.password) {
      return badRequest('Username and password are required');
    }

    const username = body.username.trim().toLowerCase();
    const displayName = body.displayName?.trim() || username;
    const role = body.role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE';
    const isActive = body.isActive !== false;

    // Check if user already exists
    const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (existing.length > 0) {
      return badRequest('Username already exists');
    }

    const passwordHash = hashPassword(body.password);

    let createdUser: any;
    await db.transaction(async (tx) => {
      const [u] = await tx.insert(users).values({
        username,
        passwordHash,
        displayName,
        role,
        isActive,
        permissions: {},
      }).returning({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

      createdUser = u;

      // Add company access
      if (body.companyIds && Array.isArray(body.companyIds)) {
        for (const companyId of body.companyIds) {
          await tx.insert(userCompanyAccess).values({
            userId: u.id,
            companyId: parseInt(companyId, 10),
          });
        }
      }
    });

    writeAuditLog({
      userId: authCtx.userId,
      companyId: 0, // global action
      action: 'CREATE',
      entityType: 'user',
      entityId: createdUser.id,
      changes: { username, role, displayName },
    });

    return created(createdUser);
  } catch (err) {
    console.error('POST /api/users error:', err);
    return serverError('Failed to create user');
  }
}
