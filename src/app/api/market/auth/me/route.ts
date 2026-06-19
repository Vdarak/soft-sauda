/**
 * GET /api/market/auth/me — current marketplace member session.
 */
import { NextRequest } from 'next/server';
import { ok, unauthorized } from '@/lib/api-helpers';
import { getMemberContext } from '@/lib/market-auth';

export async function GET(req: NextRequest) {
  const ctx = await getMemberContext(req);
  if (!ctx) return unauthorized();
  return ok({
    member: {
      id: ctx.memberId,
      name: ctx.name,
      phone: ctx.phone,
      role: ctx.role,
      isVerified: ctx.isVerified,
      tokenBalance: ctx.tokenBalance,
    },
  });

}
