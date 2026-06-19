import { NextRequest } from 'next/server';
import { ok, unauthorized } from '@/lib/api-helpers';
import { getMemberContext } from '@/lib/market-auth';
import { db } from '@/db';
import { members } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const ctx = await getMemberContext(req);
  if (!ctx) return unauthorized();

  await db
    .update(members)
    .set({ lastActive: new Date() })
    .where(eq(members.id, ctx.memberId));

  return ok({ success: true });
}
