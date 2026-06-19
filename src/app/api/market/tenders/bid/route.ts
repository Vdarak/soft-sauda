/**
 * POST /api/market/tenders/bid — submit a bid on a government tender.
 * Locks the required token amount from the member's balance.
 */
import { NextRequest } from 'next/server';
import { badRequest, created, forbidden, unauthorized } from '@/lib/api-helpers';
import { getMemberContext } from '@/lib/market-auth';
import { db } from '@/db';
import { listings, commodities, members, bids } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface BidBody {
  listingId: number;
  bidPricePerQuintal: number | string;
  qtyQuintals: number | string;
}

export async function POST(req: NextRequest) {
  const ctx = await getMemberContext(req);
  if (!ctx) return unauthorized('Sign in to submit a bid');

  let body: BidBody | null = null;
  try {
    body = (await req.json()) as BidBody;
  } catch {
    return badRequest('Invalid request body');
  }

  const listingId = Number(body?.listingId);
  const bidPrice = Number(body?.bidPricePerQuintal);
  const qty = Number(body?.qtyQuintals);

  if (!listingId || isNaN(listingId)) return badRequest('listingId is required');
  if (!bidPrice || isNaN(bidPrice) || bidPrice <= 0) return badRequest('Valid bidPricePerQuintal is required');
  if (!qty || isNaN(qty) || qty <= 0) return badRequest('Valid qtyQuintals is required');

  // Fetch the tender listing
  const [tender] = await db
    .select({
      id: listings.id,
      listingType: listings.listingType,
      status: listings.status,
      commodityId: listings.commodityId,
      pricePerQuintal: listings.pricePerQuintal,
      closeDate: listings.closeDate,
      commodityName: commodities.name,
      volatilityTier: commodities.volatilityTier,
    })
    .from(listings)
    .leftJoin(commodities, eq(listings.commodityId, commodities.id))
    .where(eq(listings.id, listingId))
    .limit(1);

  if (!tender) return badRequest('Tender not found');
  if (tender.listingType !== 'TENDER') return badRequest('This listing is not a tender');
  if (tender.status !== 'ACTIVE') return badRequest('This tender is no longer active');
  if (tender.closeDate && new Date() > new Date(tender.closeDate)) {
    return badRequest('This tender has closed');
  }

  // Calculate required token deposit
  // Volatility Tier drives the token deposit percentage:
  // LOW = 2%, MEDIUM = 5%, HIGH = 10%
  const volTier = tender.volatilityTier || 'MEDIUM';
  let tokenPct = 0.05; // default MEDIUM
  if (volTier === 'LOW') tokenPct = 0.02;
  else if (volTier === 'HIGH') tokenPct = 0.10;

  const totalValue = bidPrice * qty;
  const tokenRequired = totalValue * tokenPct;

  // Fetch member's current token balance
  const [member] = await db
    .select({
      tokenBalance: members.tokenBalance,
    })
    .from(members)
    .where(eq(members.id, ctx.memberId))
    .limit(1);

  if (!member) return forbidden('Member not found');
  const currentBalance = Number(member.tokenBalance);

  if (currentBalance < tokenRequired) {
    return badRequest(`Insufficient token balance. Required deposit: ₹${tokenRequired.toFixed(2)} (based on ${volTier} volatility commodity at ${(tokenPct * 100).toFixed(0)}%). Your balance: ₹${currentBalance.toFixed(2)}.`);
  }

  // Transaction: 1. Deduct tokenBalance. 2. Insert bid.
  const result = await db.transaction(async (tx) => {
    const newBalance = currentBalance - tokenRequired;
    await tx
      .update(members)
      .set({ tokenBalance: String(newBalance) })
      .where(eq(members.id, ctx.memberId));

    const [newBid] = await tx
      .insert(bids)
      .values({
        listingId,
        memberId: ctx.memberId,
        bidPricePerQuintal: String(bidPrice),
        qtyQuintals: String(qty),
        tokenLocked: String(tokenRequired),
        status: 'PENDING',
      })
      .returning();

    return newBid;
  });

  return created({ bid: result, tokenLocked: tokenRequired });
}
