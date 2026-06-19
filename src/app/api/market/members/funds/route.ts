/**
 * POST /api/market/members/funds — add mock funds to member's token balance.
 */
import { NextRequest } from 'next/server';
import { badRequest, ok, unauthorized } from '@/lib/api-helpers';
import { getMemberContext } from '@/lib/market-auth';
import { db } from '@/db';
import { members } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const ctx = await getMemberContext(req);
  if (!ctx) return unauthorized('Sign in to add funds');

  let body: { amount?: number | string } | null = null;
  try {
    body = (await req.json()) as { amount?: number | string };
  } catch {
    return badRequest('Invalid request body');
  }

  const amt = Number(body?.amount);
  if (!amt || isNaN(amt) || amt <= 0) {
    return badRequest('Provide a valid positive amount');
  }

  // Fetch current member
  const [member] = await db
    .select({ tokenBalance: members.tokenBalance })
    .from(members)
    .where(eq(members.id, ctx.memberId))
    .limit(1);

  if (!member) return badRequest('Member not found');

  const newBalance = Number(member.tokenBalance) + amt;
  
  await db
    .update(members)
    .set({ tokenBalance: newBalance.toFixed(2) })
    .where(eq(members.id, ctx.memberId));

  return ok({ success: true, balance: newBalance });
}
