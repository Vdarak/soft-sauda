import { NextRequest } from 'next/server';
import { ok, unauthorized, notFound } from '@/lib/api-helpers';
import { getMemberContext } from '@/lib/market-auth';
import { db } from '@/db';
import { chats, chatMessages } from '@/db/schema';
import { and, eq, ne } from 'drizzle-orm';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getMemberContext(req);
  if (!ctx) return unauthorized();

  const { id } = await params;
  const roomId = parseInt(id, 10);
  if (isNaN(roomId)) return notFound('Room not found');

  // Verify membership
  const [chat] = await db
    .select({ buyerId: chats.buyerId, sellerId: chats.sellerId })
    .from(chats)
    .where(eq(chats.id, roomId))
    .limit(1);

  if (!chat) return notFound('Room not found');
  if (chat.buyerId !== ctx.memberId && chat.sellerId !== ctx.memberId) {
    return unauthorized('You do not have access to this chat');
  }

  // Mark all counterparty messages as read
  await db
    .update(chatMessages)
    .set({ isRead: true })
    .where(
      and(
        eq(chatMessages.roomId, roomId),
        ne(chatMessages.senderId, ctx.memberId)
      )
    );

  return ok({ success: true });
}
