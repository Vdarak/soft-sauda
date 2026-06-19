/**
 * POST /api/market/auth/register — public marketplace sign-up.
 *
 * Creates a member (separate identity realm from staff users) and returns a
 * member token. Optionally auto-links to an existing ERP party by phone when
 * the `autolink.enabled` toggle is on (default OFF -> staff links manually).
 */
import { NextRequest } from 'next/server';
import { badRequest, created } from '@/lib/api-helpers';
import { hashPassword } from '@/lib/api-helpers';
import { createMemberToken } from '@/lib/market-auth';
import { db } from '@/db';
import { members, parties } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface RegisterBody {
  name: string;
  phone: string;
  password: string;
  email?: string;
  role?: 'BUYER' | 'SELLER' | 'BOTH';
}

// Auto-link toggle (decision #5). Default OFF — staff link members to parties
// manually. Flip via env until the settings table lands in M4.
const AUTOLINK_ENABLED = process.env.MARKET_AUTOLINK === 'true';

export async function POST(req: NextRequest) {
  let body: RegisterBody | null = null;
  try {
    body = (await req.json()) as RegisterBody;
  } catch {
    return badRequest('Invalid request body');
  }

  const name = body?.name?.trim();
  const phone = body?.phone?.trim();
  const password = body?.password;
  if (!name || !phone || !password) {
    return badRequest('Name, phone and password are required');
  }
  if (password.length < 6) {
    return badRequest('Password must be at least 6 characters');
  }
  const role = body.role && ['BUYER', 'SELLER', 'BOTH'].includes(body.role) ? body.role : 'BOTH';

  // Unique phone = the marketplace identity.
  const [existing] = await db.select({ id: members.id }).from(members).where(eq(members.phone, phone)).limit(1);
  if (existing) {
    return badRequest('An account with this phone already exists');
  }

  // Optional auto-link to an ERP party by phone.
  let partyId: number | null = null;
  if (AUTOLINK_ENABLED) {
    const [party] = await db.select({ id: parties.id }).from(parties).where(eq(parties.phone, phone)).limit(1);
    if (party) partyId = party.id;
  }

  const [member] = await db
    .insert(members)
    .values({
      name,
      phone,
      email: body.email?.trim() || null,
      passwordHash: hashPassword(password),
      role,
      partyId,
    })
    .returning({ id: members.id, name: members.name, phone: members.phone, role: members.role });

  const token = await createMemberToken({
    mid: member.id,
    name: member.name,
    phone: member.phone,
    role: member.role,
  });

  return created({
    token,
    member: { id: member.id, name: member.name, phone: member.phone, role: member.role, isVerified: false, tokenBalance: '100000.00' },
  });
}

