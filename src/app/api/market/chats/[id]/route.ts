/**
 * GET  /api/market/chats/[id] — get chat detail and messages.
 * POST /api/market/chats/[id] — send a message or propose an agreed price.
 */
import { NextRequest } from 'next/server';
import { badRequest, ok, unauthorized, notFound } from '@/lib/api-helpers';
import { getMemberContext } from '@/lib/market-auth';
import { db } from '@/db';
import {
  chats,
  chatMessages,
  listings,
  members,
  parties,
  contracts,
  contractParties,
  contractLines,
  companies,
  fiscalYears,
  commodities
} from '@/db/schema';
import { and, desc, eq, sql } from 'drizzle-orm';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getMemberContext(req);
  if (!ctx) return unauthorized('Sign in to view chat');

  const { id } = await params;
  const roomId = parseInt(id, 10);
  if (isNaN(roomId)) return notFound('Room not found');

  // Fetch chat details
  const [chat] = await db
    .select({
      id: chats.id,
      listingId: chats.listingId,
      buyerId: chats.buyerId,
      sellerId: chats.sellerId,
      agreedBuyerPrice: chats.agreedBuyerPrice,
      agreedSellerPrice: chats.agreedSellerPrice,
      commissionRate: chats.commissionRate,
      status: chats.status,
      listingTitle: listings.title,
      listingQty: listings.qtyQuintals,
      commodityId: listings.commodityId,
      commodityName: commodities.name,
      volatilityTier: commodities.volatilityTier,
      buyerName: members.name,
    })
    .from(chats)
    .innerJoin(listings, eq(chats.listingId, listings.id))
    .leftJoin(commodities, eq(listings.commodityId, commodities.id))
    .leftJoin(members, eq(chats.buyerId, members.id))
    .where(eq(chats.id, roomId))
    .limit(1);

  if (!chat) return notFound('Room not found');
  if (chat.buyerId !== ctx.memberId && chat.sellerId !== ctx.memberId) {
    return unauthorized('You do not have access to this chat');
  }

  // Get seller details
  const [seller] = await db
    .select({ name: members.name, lastActive: members.lastActive })
    .from(members)
    .where(eq(members.id, chat.sellerId))
    .limit(1);

  // Get buyer details to get lastActive for buyer in case we are seller
  const [buyer] = await db
    .select({ name: members.name, lastActive: members.lastActive })
    .from(members)
    .where(eq(members.id, chat.buyerId))
    .limit(1);

  const isBuyer = chat.buyerId === ctx.memberId;
  const counterparty = isBuyer ? seller : buyer;
  const isOnline = counterparty?.lastActive
    ? (Date.now() - new Date(counterparty.lastActive).getTime() < 15000)
    : false;

  // Fetch messages
  const messages = await db
    .select({
      id: chatMessages.id,
      roomId: chatMessages.roomId,
      senderId: chatMessages.senderId,
      messageText: chatMessages.messageText,
      isRead: chatMessages.isRead,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(eq(chatMessages.roomId, roomId))
    .orderBy(desc(chatMessages.createdAt));

  return ok({
    chat: {
      ...chat,
      isBuyer,
      sellerName: seller?.name || 'Unknown Seller',
      counterpartyName: counterparty?.name || 'Unknown Partner',
      isOnline,
      lastActive: counterparty?.lastActive || null,
    },
    messages,
  });
}

interface PostMessageBody {
  messageText?: string;
  agreedPrice?: number | string;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getMemberContext(req);
  if (!ctx) return unauthorized('Sign in to post message');

  const { id } = await params;
  const roomId = parseInt(id, 10);
  if (isNaN(roomId)) return notFound('Room not found');

  let body: PostMessageBody | null = null;
  try {
    body = (await req.json()) as PostMessageBody;
  } catch {
    return badRequest('Invalid request body');
  }

  // Fetch chat room details
  const [chat] = await db
    .select({
      id: chats.id,
      listingId: chats.listingId,
      buyerId: chats.buyerId,
      sellerId: chats.sellerId,
      agreedBuyerPrice: chats.agreedBuyerPrice,
      agreedSellerPrice: chats.agreedSellerPrice,
      commissionRate: chats.commissionRate,
      status: chats.status,
      listingQty: listings.qtyQuintals,
      commodityId: listings.commodityId,
      commodityName: commodities.name,
      volatilityTier: commodities.volatilityTier,
      listingTitle: listings.title,
    })
    .from(chats)
    .innerJoin(listings, eq(chats.listingId, listings.id))
    .leftJoin(commodities, eq(listings.commodityId, commodities.id))
    .where(eq(chats.id, roomId))
    .limit(1);

  if (!chat) return notFound('Room not found');
  if (chat.buyerId !== ctx.memberId && chat.sellerId !== ctx.memberId) {
    return unauthorized('You do not have access to this chat');
  }

  if (chat.status !== 'NEGOTIATING') {
    return badRequest('Negotiation is already closed');
  }

  const isBuyer = chat.buyerId === ctx.memberId;
  const senderId = ctx.memberId;
  const messageText = body?.messageText?.trim();
  const proposedPrice = body?.agreedPrice != null ? Number(body.agreedPrice) : null;

  if (!messageText && proposedPrice == null) {
    return badRequest('Provide messageText or agreedPrice');
  }

  const result = await db.transaction(async (tx) => {
    // 1. Post standard text message if present
    if (messageText) {
      await tx.insert(chatMessages).values({
        roomId,
        senderId,
        messageText,
      });
    }

    let updatedBuyerPrice = chat.agreedBuyerPrice;
    let updatedSellerPrice = chat.agreedSellerPrice;

    // 2. Process price proposal if present
    if (proposedPrice != null && !isNaN(proposedPrice) && proposedPrice > 0) {
      const formattedPrice = proposedPrice.toFixed(2);
      if (isBuyer) {
        updatedBuyerPrice = formattedPrice;
        await tx
          .update(chats)
          .set({ agreedBuyerPrice: formattedPrice })
          .where(eq(chats.id, roomId));
      } else {
        updatedSellerPrice = formattedPrice;
        await tx
          .update(chats)
          .set({ agreedSellerPrice: formattedPrice })
          .where(eq(chats.id, roomId));
      }

      const roleLabel = isBuyer ? 'Buyer' : 'Seller';
      await tx.insert(chatMessages).values({
        roomId,
        senderId: null, // System message
        messageText: `${roleLabel} proposed a rate of ₹${formattedPrice} / quintal.`,
      });

      // 3. Auto-match check
      if (
        updatedBuyerPrice &&
        updatedSellerPrice &&
        Number(updatedBuyerPrice) === Number(updatedSellerPrice)
      ) {
        const finalRate = Number(updatedBuyerPrice);
        const qty = Number(chat.listingQty || '0');
        const commRate = Number(chat.commissionRate);
        const tradeValue = finalRate * qty;
        const commissionVal = tradeValue * commRate;

        // Mark chat agreed
        await tx
          .update(chats)
          .set({ status: 'AGREED' })
          .where(eq(chats.id, roomId));

        // Mark listing sold
        await tx
          .update(listings)
          .set({ status: 'SOLD' })
          .where(eq(listings.id, chat.listingId));

        // Create ERP Contract (Sauda)
        // A. Resolve company & current fiscal year
        const [company] = await tx
          .select({ id: companies.id, name: companies.name })
          .from(companies)
          .where(eq(companies.isActive, true))
          .limit(1);

        const [fy] = company
          ? await tx
              .select({ id: fiscalYears.id, label: fiscalYears.label })
              .from(fiscalYears)
              .where(and(eq(fiscalYears.companyId, company.id), eq(fiscalYears.isCurrent, true)))
              .limit(1)
          : [null];

        if (company && fy) {
          // B. Get buyer and seller party mapping
          const [buyerMember] = await tx
            .select({ name: members.name, phone: members.phone, partyId: members.partyId })
            .from(members)
            .where(eq(members.id, chat.buyerId))
            .limit(1);

          const [sellerMember] = await tx
            .select({ name: members.name, phone: members.phone, partyId: members.partyId })
            .from(members)
            .where(eq(members.id, chat.sellerId))
            .limit(1);

          let buyerPartyId = buyerMember?.partyId;
          if (buyerMember && !buyerPartyId) {
            const [existing] = await tx
              .select({ id: parties.id })
              .from(parties)
              .where(eq(parties.name, buyerMember.name.trim()))
              .limit(1);
            if (existing) {
              buyerPartyId = existing.id;
            } else {
              const [inserted] = await tx
                .insert(parties)
                .values({ name: buyerMember.name.trim(), phone: buyerMember.phone })
                .returning({ id: parties.id });
              buyerPartyId = inserted.id;
            }
            await tx
              .update(members)
              .set({ partyId: buyerPartyId })
              .where(eq(members.id, chat.buyerId));
          }

          let sellerPartyId = sellerMember?.partyId;
          if (sellerMember && !sellerPartyId) {
            const [existing] = await tx
              .select({ id: parties.id })
              .from(parties)
              .where(eq(parties.name, sellerMember.name.trim()))
              .limit(1);
            if (existing) {
              sellerPartyId = existing.id;
            } else {
              const [inserted] = await tx
                .insert(parties)
                .values({ name: sellerMember.name.trim(), phone: sellerMember.phone })
                .returning({ id: parties.id });
              sellerPartyId = inserted.id;
            }
            await tx
              .update(members)
              .set({ partyId: sellerPartyId })
              .where(eq(members.id, chat.sellerId));
          }

          // C. Calculate next saudaNo
          const [maxSauda] = await tx
            .select({ maxNo: sql<number>`max(${contracts.saudaNo})` })
            .from(contracts)
            .where(and(eq(contracts.companyId, company.id), eq(contracts.fiscalYearId, fy.id)))
            .limit(1);
          const nextSaudaNo = (maxSauda?.maxNo || 0) + 1;

          // D. Create contract
          const [contract] = await tx
            .insert(contracts)
            .values({
              companyId: company.id,
              fiscalYearId: fy.id,
              saudaNo: nextSaudaNo,
              saudaBook: 'Marketplace',
              saudaDate: new Date(),
              status: 'ACTIVE',
              approxWeight: String(qty),
              customRemarks: "Automatically generated from Marketplace Negotiation (Room #" + roomId + ") between " + (buyerMember?.name || "Unknown") + " and " + (sellerMember?.name || "Unknown") + ".",
            })
            .returning();

          // E. Insert parties
          const partyInserts = [];
          if (buyerPartyId) {
            partyInserts.push({
              contractId: contract.id,
              partyId: buyerPartyId,
              role: 'BUYER' as const,
            });
          }
          if (sellerPartyId) {
            partyInserts.push({
              contractId: contract.id,
              partyId: sellerPartyId,
              role: 'SELLER' as const,
            });
          }
          if (partyInserts.length > 0) {
            await tx.insert(contractParties).values(partyInserts);
          }

          // F. Insert line item
          await tx.insert(contractLines).values({
            contractId: contract.id,
            commodityId: chat.commodityId,
            weightQuintals: String(qty),
            rate: String(finalRate),
            amount: String(tradeValue),
          });

          await tx.insert(chatMessages).values({
            roomId,
            senderId: null,
            messageText: "Deal matched! Final Rate: ₹" + finalRate + " / quintal. Platform commission calculated: ₹" + commissionVal.toFixed(2) + " (" + (commRate * 100).toFixed(1) + "%). Draft Contract (Sauda #" + nextSaudaNo + ") has been generated in the ERP division \"" + company.name + "\".",
          });

        } else {
          await tx.insert(chatMessages).values({
            roomId,
            senderId: null,
            messageText: "Deal matched! Final Rate: ₹" + finalRate + " / quintal. Platform commission calculated: ₹" + commissionVal.toFixed(2) + " (" + (commRate * 100).toFixed(1) + "%).",
          });

        }
      }
    }

    // Update chats.updatedAt timestamp
    await tx
      .update(chats)
      .set({ updatedAt: new Date() })
      .where(eq(chats.id, roomId));
  });

  // Fetch updated messages to return
  const messages = await db
    .select({
      id: chatMessages.id,
      roomId: chatMessages.roomId,
      senderId: chatMessages.senderId,
      messageText: chatMessages.messageText,
      isRead: chatMessages.isRead,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(eq(chatMessages.roomId, roomId))
    .orderBy(desc(chatMessages.createdAt));

  return ok({ success: true, messages });
}
