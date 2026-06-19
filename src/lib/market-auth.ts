/**
 * Marketplace member auth — a SEPARATE identity realm from staff `users`.
 *
 * Members self-register on the public marketplace and authenticate with their
 * own token (claim `kind: 'member'`). This token is NOT interchangeable with
 * the staff ERP token: getMemberContext rejects staff tokens and vice-versa,
 * so a marketplace credential can never reach ERP data.
 */

import { NextRequest } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { db } from '@/db';
import { members } from '@/db/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_JWT_SECRET || 'soft-sauda-default-secret-change-me',
);
const SESSION_MAX_AGE = parseInt(process.env.AUTH_SESSION_MAX_AGE_SECONDS || '86400', 10);

export interface MemberContext {
  memberId: number;
  name: string;
  phone: string;
  role: 'BUYER' | 'SELLER' | 'BOTH';
  isVerified: boolean;
  partyId: number | null;
  tokenBalance: string;
}

/** Create a signed marketplace member token (distinct from the staff token). */
export async function createMemberToken(params: {
  mid: number;
  name: string;
  phone: string;
  role: string;
}): Promise<string> {
  return new SignJWT({
    kind: 'member',
    mid: params.mid,
    name: params.name,
    phone: params.phone,
    role: params.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(JWT_SECRET);
}

/**
 * Resolve the marketplace member from the request token.
 * Returns null when the token is missing, invalid, not a member token, or the
 * member is inactive. Re-reads the member from the DB so role/verification are
 * always current.
 */
export async function getMemberContext(req: NextRequest): Promise<MemberContext | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);

  let payload;
  try {
    ({ payload } = await jwtVerify(token, JWT_SECRET));
  } catch {
    return null;
  }

  // Must be a member token — reject staff tokens explicitly.
  if (payload.kind !== 'member' || !payload.mid) return null;

  const [m] = await db
    .select({
      id: members.id,
      name: members.name,
      phone: members.phone,
      role: members.role,
      isVerified: members.isVerified,
      isActive: members.isActive,
      partyId: members.partyId,
      tokenBalance: members.tokenBalance,
    })
    .from(members)
    .where(eq(members.id, payload.mid as number))
    .limit(1);

  if (!m || !m.isActive) return null;

  return {
    memberId: m.id,
    name: m.name,
    phone: m.phone,
    role: m.role as MemberContext['role'],
    isVerified: m.isVerified,
    partyId: m.partyId,
    tokenBalance: m.tokenBalance,
  };
}

