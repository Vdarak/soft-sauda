/**
 * POST /api/market/auth/login — marketplace member login (phone + password).
 */
import { NextRequest } from 'next/server';
import { badRequest, ok, unauthorized, verifyPassword } from '@/lib/api-helpers';
import { createMemberToken } from '@/lib/market-auth';
import { db } from '@/db';
import { members } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface LoginBody {
  phone: string;
  password: string;
}

export async function POST(req: NextRequest) {
  let body: LoginBody | null = null;
  try {
    body = (await req.json()) as LoginBody;
  } catch {
    return badRequest('Invalid request body');
  }

  const phone = body?.phone?.trim();
  const password = body?.password;
  if (!phone || !password) {
    return badRequest('Phone and password are required');
  }

  const [member] = await db.select().from(members).where(eq(members.phone, phone)).limit(1);
  if (!member || !member.isActive) {
    return unauthorized('Invalid credentials');
  }
  if (!verifyPassword(password, member.passwordHash)) {
    return unauthorized('Invalid credentials');
  }

  await db.update(members).set({ lastLogin: new Date() }).where(eq(members.id, member.id));

  const token = await createMemberToken({
    mid: member.id,
    name: member.name,
    phone: member.phone,
    role: member.role,
  });

  return ok({
    token,
    member: {
      id: member.id,
      name: member.name,
      phone: member.phone,
      role: member.role,
      isVerified: member.isVerified,
      tokenBalance: member.tokenBalance,
    },
  });
}

