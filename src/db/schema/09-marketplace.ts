import { pgTable, serial, integer, text, numeric, timestamp, uniqueIndex, index, boolean } from "drizzle-orm/pg-core";
import { memberRoleEnum, listingTypeEnum, listingDirectionEnum, listingStatusEnum, bidStatusEnum, chatStatusEnum } from "./enums";
import { parties } from "./02-parties";
import { commodities, commodityPackaging } from "./03-commodities";
import { cities } from "./01-locations";

// ==========================================================================
// 9. MARKETPLACE DOMAIN (Public Marketplace — Separate Identity Realm)
//
// Members are a DISTINCT identity from staff `users`. They self-register on
// the public marketplace and authenticate with their own token. `partyId` is
// an optional bridge to an existing ERP party (for history/recommendations).
// ==========================================================================

export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  passwordHash: text("password_hash").notNull(),
  role: memberRoleEnum("role").default('BOTH').notNull(),
  // Optional bridge to an existing ERP party (auto-link is toggleable; default manual).
  partyId: integer("party_id").references(() => parties.id),
  tokenBalance: numeric("token_balance", { precision: 15, scale: 2 }).default('100000.00').notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastLogin: timestamp("last_login"),
  lastActive: timestamp("last_active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  idxPartyId: index("idx_members_party_id").on(t.partyId),
}));

export const listings = pgTable("listings", {
  id: serial("id").primaryKey(),
  // Seller member. Nullable so staff can publish tenders with no member owner.
  memberId: integer("member_id").references(() => members.id, { onDelete: "cascade" }),
  listingType: listingTypeEnum("listing_type").default('OPEN').notNull(),
  direction: listingDirectionEnum("direction").default('SELL').notNull(),
  // What's on offer — reuse existing commodity masters.
  commodityId: integer("commodity_id").references(() => commodities.id).notNull(),
  packagingId: integer("packaging_id").references(() => commodityPackaging.id),
  title: text("title").notNull(),
  qualityNotes: text("quality_notes"),
  qtyQuintals: numeric("qty_quintals", { precision: 15, scale: 3 }),
  pricePerQuintal: numeric("price_per_quintal", { precision: 15, scale: 2 }),  // nullable for tenders
  cityId: integer("city_id").references(() => cities.id),
  status: listingStatusEnum("status").default('ACTIVE').notNull(),
  closeDate: timestamp("close_date"),  // tenders only
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  idxMemberId: index("idx_listings_member_id").on(t.memberId),
  idxCommodityId: index("idx_listings_commodity_id").on(t.commodityId),
  idxStatus: index("idx_listings_status").on(t.status),
  idxCreatedAt: index("idx_listings_created_at").on(t.createdAt),
}));

export const watchlist = pgTable("watchlist", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id, { onDelete: "cascade" }).notNull(),
  listingId: integer("listing_id").references(() => listings.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  unqMemberListing: uniqueIndex("unq_watchlist_member_listing").on(t.memberId, t.listingId),
  idxMemberId: index("idx_watchlist_member_id").on(t.memberId),
}));

export const bids = pgTable("bids", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").references(() => listings.id, { onDelete: "cascade" }).notNull(),
  memberId: integer("member_id").references(() => members.id, { onDelete: "cascade" }).notNull(),
  bidPricePerQuintal: numeric("bid_price_per_quintal", { precision: 15, scale: 2 }).notNull(),
  qtyQuintals: numeric("qty_quintals", { precision: 15, scale: 3 }).notNull(),
  tokenLocked: numeric("token_locked", { precision: 15, scale: 2 }).notNull(),
  status: bidStatusEnum("status").default('PENDING').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  idxListingId: index("idx_bids_listing_id").on(t.listingId),
  idxMemberId: index("idx_bids_member_id").on(t.memberId),
}));

export const chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").references(() => listings.id, { onDelete: "cascade" }).notNull(),
  buyerId: integer("buyer_id").references(() => members.id, { onDelete: "cascade" }).notNull(),
  sellerId: integer("seller_id").references(() => members.id, { onDelete: "cascade" }).notNull(),
  agreedBuyerPrice: numeric("agreed_buyer_price", { precision: 15, scale: 2 }),
  agreedSellerPrice: numeric("agreed_seller_price", { precision: 15, scale: 2 }),
  commissionRate: numeric("commission_rate", { precision: 5, scale: 4 }).notNull(), // e.g. 0.0050 for 0.5%
  status: chatStatusEnum("status").default('NEGOTIATING').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  idxListingId: index("idx_chats_listing_id").on(t.listingId),
  idxBuyerId: index("idx_chats_buyer_id").on(t.buyerId),
  idxSellerId: index("idx_chats_seller_id").on(t.sellerId),
}));

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").references(() => chats.id, { onDelete: "cascade" }).notNull(),
  senderId: integer("sender_id").references(() => members.id, { onDelete: "cascade" }), // null if system message
  messageText: text("message_text").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  idxRoomId: index("idx_chat_messages_room_id").on(t.roomId),
}));
