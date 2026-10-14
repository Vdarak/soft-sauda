import { pgTable, serial, integer, text, numeric, timestamp, date, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { commodities } from "./03-commodities";
import { cities } from "./01-locations";

// ==========================================================================
// 10. DAILY MARKET RATES & CHATBOT ASSISTANT DOMAIN
//
// Ingestion, staging, and approval workflow for daily spot and port rates
// (Toor, Moong, Urad, Chana, etc.) across Indian mandis and ports.
// ==========================================================================

export const scrapedRawRates = pgTable("scraped_raw_rates", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(), // 'commoditiescontrol' | 'commodityworld' | 'manual'
  title: text("title"),
  rawPayload: jsonb("raw_payload").notNull(),
  scrapedAt: timestamp("scraped_at").defaultNow().notNull(),
});

export const dailyMarketRates = pgTable("daily_market_rates", {
  id: serial("id").primaryKey(),
  rateDate: date("rate_date").notNull(),
  session: text("session").default("MORNING").notNull(), // 'MORNING' | 'MIDDAY' | 'CLOSING'
  commodityName: text("commodity_name").notNull(), // 'Toor', 'Chana', 'Moong', 'Urad', 'Masoor', 'Peas'
  commodityId: integer("commodity_id").references(() => commodities.id),
  variety: text("variety").notNull(), // e.g. 'Desi', 'Lemon', 'Harusa', 'Shining', 'SQ', 'FAQ'
  locationName: text("location_name").notNull(), // e.g. 'Akola', 'Latur', 'Mumbai', 'Kanpur', 'Delhi', 'Jaipur'
  cityId: integer("city_id").references(() => cities.id),
  minPrice: numeric("min_price", { precision: 12, scale: 2 }).notNull(),
  maxPrice: numeric("max_price", { precision: 12, scale: 2 }),
  modalPrice: numeric("modal_price", { precision: 12, scale: 2 }),
  priceUnit: text("price_unit").default("QTL").notNull(), // 'QTL' (per Quintal / 100 kg)
  deliveryCondition: text("delivery_condition").default("Spot Mandi").notNull(), // 'Spot Mandi', 'Port Ex-Godown', 'Mill Delivered'
  arrivalQuantityBags: integer("arrival_quantity_bags"),
  trend: text("trend").default("STEADY").notNull(), // 'STEADY' | 'FIRM' | 'WEAK' | 'UP' | 'DOWN'
  remarks: text("remarks"),
  source: text("source").default("commoditiescontrol").notNull(),
  status: text("status").default("PENDING_APPROVAL").notNull(), // 'PENDING_APPROVAL' | 'APPROVED' | 'MODIFIED' | 'REJECTED'
  approvedBy: text("approved_by"), // 'DAD_PWA' | 'AUTO_DEV' | 'ADMIN'
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  idxRateDateStatus: index("idx_daily_market_rates_date_status").on(t.rateDate, t.status),
  idxCommodityLocation: index("idx_daily_market_rates_commodity_location").on(t.commodityName, t.locationName),
}));

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  deviceInfo: text("device_info"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const rateInquiries = pgTable("rate_inquiries", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  visitorName: text("visitor_name"),
  visitorPhone: text("visitor_phone"),
  queryText: text("query_text").notNull(),
  responseText: text("response_text").notNull(),
  matchedRateIds: jsonb("matched_rate_ids"),
  isEscalated: boolean("is_escalated").default(false).notNull(),
  dadReply: text("dad_reply"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  idxInquirySession: index("idx_rate_inquiries_session").on(t.sessionId),
  idxInquiryEscalated: index("idx_rate_inquiries_escalated").on(t.isEscalated),
}));
