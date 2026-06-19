import { NextRequest } from 'next/server';
import { ok, unauthorized } from '@/lib/api-helpers';
import { getMemberContext } from '@/lib/market-auth';
import { db } from '@/db';
import { members } from '@/db/schema';
import { and, eq, ne, or, ilike } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const ctx = await getMemberContext(req);
  if (!ctx) return unauthorized();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';

  const rows = await db
    .select({
      id: members.id,
      name: members.name,
      phone: members.phone,
      role: members.role,
      lastActive: members.lastActive,
      isVerified: members.isVerified,
    })
    .from(members)
    .where(
      and(
        ne(members.id, ctx.memberId),
        eq(members.isActive, true),
        q
          ? or(
              ilike(members.name, `%${q}%`),
              ilike(members.phone, `%${q}%`)
            )
          : undefined
      )
    )
    .limit(50);

  const enriched = rows.map(m => {
    const isOnline = m.lastActive ? (Date.now() - new Date(m.lastActive).getTime() < 15000) : false;
    return {
      id: m.id,
      name: m.name,
      phone: m.phone,
      role: m.role,
      isVerified: m.isVerified,
      isOnline,
    };
  });

  return ok({ members: enriched });
}
