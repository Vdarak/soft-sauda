import { pgTable, serial, integer, text, numeric, timestamp, index, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { volatilityTierEnum } from "./enums";
import { companies } from "./00-auth-companies";

// ==========================================
// 3. COMMODITIES & BRANDS DOMAIN
// ==========================================

export const commodityGroups = pgTable("commodity_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const commodities = pgTable("commodities", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => commodityGroups.id),
  name: text("name").notNull().unique(),
  description: text("description"),
  shortName: text("short_name"),
  unit: text("unit"),
  hsnCode: text("hsn_code"),
  // Marketplace: volatility tier drives commission % and token % (settings-driven)
  volatilityTier: volatilityTierEnum("volatility_tier").default('MEDIUM'),
  // Sharing & Isolation (future-proof)
  isShared: boolean("is_shared").default(true).notNull(),
  companyId: integer("company_id").references(() => companies.id),  // nullable: only set when isShared=false
}, (t) => ({
  nameTrgmIdx: index("idx_commodities_name_trgm").using("gin", sql`${t.name} gin_trgm_ops`),
  idxCompanyId: index("idx_commodities_company_id").on(t.companyId),
}));

export const commodityPackaging = pgTable("commodity_packaging", {
  id: serial("id").primaryKey(),
  commodityId: integer("commodity_id").references(() => commodities.id, { onDelete: "cascade" }).notNull(),
  packingWeight: numeric("packing_weight", { precision: 10, scale: 3 }).notNull(),
  packingWeight2: numeric("packing_weight_2", { precision: 10, scale: 3 }),
  packingType: text("packing_type").notNull(),
  sellerBrokerageRate: numeric("seller_brokerage_rate", { precision: 10, scale: 2 }),
  sellerBrokerageType: text("seller_brokerage_type"),
  buyerBrokerageRate: numeric("buyer_brokerage_rate", { precision: 10, scale: 2 }),
  buyerBrokerageType: text("buyer_brokerage_type"),
});

export const commoditySpecifications = pgTable("commodity_specifications", {
  id: serial("id").primaryKey(),
  commodityId: integer("commodity_id").references(() => commodities.id, { onDelete: "cascade" }).notNull(),
  specification: text("specification").notNull(),
  specValue: numeric("spec_value", { precision: 10, scale: 2 }),
  minMax: text("min_max"),
  remarks: text("remarks"),
});

export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  isRegistered: boolean("is_registered").default(false),
  regNo: text("reg_no"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const brandPackaging = pgTable("brand_packaging", {
  id: serial("id").primaryKey(),
  brandId: integer("brand_id").references(() => brands.id, { onDelete: "cascade" }).notNull(),
  packWeight: numeric("pack_weight", { precision: 10, scale: 3 }),
  innerPacking: text("inner_packing"),
}, (t) => ({
  idxBrandId: index("idx_brand_pkg_brand_id").on(t.brandId),
}));
