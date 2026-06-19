/**
 * GET  /api/market/chats — get all active negotiations for the member.
 * POST /api/market/chats — start a new negotiation room for a listing.
 */
import { NextRequest } from 'next/server';
import { badRequest, created, forbidden, ok, unauthorized } from '@/lib/api-helpers';
import { getMemberContext } from '@/lib/market-auth';
import { db } from '@/db';
import { chats, chatMessages, listings, commodities, members } from '@/db/schema';
import { and, desc, eq, or, sql, ne } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const ctx = await getMemberContext(req);
  if (!ctx) return unauthorized('Sign in to view negotiations');

  // Query chats the member is involved in, either as buyer or seller.
  // Join listing details and counterparty details.
  const rows = await db
    .select({
      id: chats.id,
      listingId: chats.listingId,
      buyerId: chats.buyerId,
      sellerId: chats.sellerId,
      agreedBuyerPrice: chats.agreedBuyerPrice,
      agreedSellerPrice: chats.agreedSellerPrice,
      commissionRate: chats.commissionRate,
      status: chats.status,
      createdAt: chats.createdAt,
      updatedAt: chats.updatedAt,
      listingTitle: listings.title,
      commodityName: commodities.name,
      buyerName: members.name,
    })
    .from(chats)
    .innerJoin(listings, eq(chats.listingId, listings.id))
    .leftJoin(commodities, eq(listings.commodityId, commodities.id))
    .leftJoin(members, eq(chats.buyerId, members.id))
    .where(or(eq(chats.buyerId, ctx.memberId), eq(chats.sellerId, ctx.memberId)))
    .orderBy(desc(chats.updatedAt));

  if (rows.length === 0) {
    return ok({ chats: [] });
  }

  // Enrich with counterparty info
  const memberIds = new Set<number>();
  rows.forEach(r => {
    memberIds.add(r.buyerId);
    memberIds.add(r.sellerId);
  });

  const memberRows = await db
    .select({ id: members.id, name: members.name, lastActive: members.lastActive })
    .from(members)
    .where(sql`${members.id} IN (${sql.join(Array.from(memberIds).map(id => sql`${id}`), sql`, `)})`);

  const memberMap = new Map(memberRows.map(m => [m.id, m]));

  // Count unread messages per room for this user
  const unreadCounts = await db
    .select({
      roomId: chatMessages.roomId,
      count: sql<number>`count(${chatMessages.id})::int`,
    })
    .from(chatMessages)
    .where(
      and(
        sql`${chatMessages.roomId} IN (${sql.join(rows.map(r => sql`${r.id}`), sql`, `)})`,
        ne(chatMessages.senderId, ctx.memberId),
        eq(chatMessages.isRead, false)
      )
    )
    .groupBy(chatMessages.roomId);

  const unreadMap = new Map(unreadCounts.map(u => [u.roomId, u.count]));

  const chatsEnriched = rows.map(r => {
    const isBuyer = r.buyerId === ctx.memberId;
    const counterpartyId = isBuyer ? r.sellerId : r.buyerId;
    const counterparty = memberMap.get(counterpartyId);
    
    const isOnline = counterparty?.lastActive 
      ? (Date.now() - new Date(counterparty.lastActive).getTime() < 15000) 
      : false;

    return {
      ...r,
      isBuyer,
      counterpartyName: counterparty?.name || 'Unknown Member',
      isOnline,
      lastActive: counterparty?.lastActive || null,
      unreadCount: unreadMap.get(r.id) || 0,
    };
  });

  return ok({ chats: chatsEnriched });
}

interface StartChatBody {
  listingId: number;
}

export async function POST(req: NextRequest) {
  const ctx = await getMemberContext(req);
  if (!ctx) return unauthorized('Sign in to negotiate');

  let body: StartChatBody | null = null;
  try {
    body = (await req.json()) as StartChatBody;
  } catch {
    return badRequest('Invalid request body');
  }

  const listingId = Number(body?.listingId);
  if (!listingId || isNaN(listingId)) return badRequest('listingId is required');

  // Fetch listing
  const [listing] = await db
    .select({
      id: listings.id,
      memberId: listings.memberId,
      status: listings.status,
      title: listings.title,
      commodityId: listings.commodityId,
      volatilityTier: commodities.volatilityTier,
      pricePerQuintal: listings.pricePerQuintal,
    })
    .from(listings)
    .leftJoin(commodities, eq(listings.commodityId, commodities.id))
    .where(eq(listings.id, listingId))
    .limit(1);

  if (!listing) return badRequest('Listing not found');
  if (listing.status !== 'ACTIVE') return badRequest('Listing is no longer active');
  if (listing.memberId === ctx.memberId) return badRequest('You cannot negotiate with yourself');
  if (!listing.memberId) return badRequest('Cannot negotiate directly on this listing (contact GCC)');

  // Determine commission rate based on volatility
  // LOW: 0.5% (0.0050), MEDIUM: 1.0% (0.0100), HIGH: 1.5% (0.0150)
  const volTier = listing.volatilityTier || 'MEDIUM';
  let commRate = '0.0100'; // 1.0%
  if (volTier === 'LOW') commRate = '0.0050'; // 0.5%
  else if (volTier === 'HIGH') commRate = '0.0150'; // 1.5%

  // Check if negotiation already exists
  const [existingChat] = await db
    .select()
    .from(chats)
    .where(and(eq(chats.listingId, listingId), eq(chats.buyerId, ctx.memberId)))
    .limit(1);

  if (existingChat) {
    return ok({ chat: existingChat, wasExisting: true });
  }

  // Create chat room
  const chatRoom = await db.transaction(async (tx) => {
    const [newChat] = await tx
      .insert(chats)
      .values({
        listingId,
        buyerId: ctx.memberId,
        sellerId: listing.memberId!,
        commissionRate: commRate,
        status: 'NEGOTIATING',
      })
      .returning();

    // Insert system message
    await tx.insert(chatMessages).values({
      roomId: newChat.id,
      senderId: null, // System message
      messageText: `Negotiation started. Standard commission rate is ${(Number(commRate) * 100).toFixed(1)}% based on ${volTier} volatility tier of the commodity.`,
    });

    return newChat;
  });

  return created({ chat: chatRoom });
}
