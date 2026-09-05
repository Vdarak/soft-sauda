import { pgTable, serial, integer, text, numeric, timestamp, uniqueIndex, index, boolean } from "drizzle-orm/pg-core";
import { states, cities } from "./01-locations";
import { parties } from "./02-parties";
import { commodities } from "./03-commodities";

// ==========================================
// 4. GENERAL MASTER TABLES
// ==========================================

export const banks = pgTable("banks", {
  id: serial("id").primaryKey(),
  bankName: text("bank_name").notNull(),
  branch: text("branch"),
  ifscCode: text("ifsc_code"),
  micrCode: text("micr_code"),
  address: text("address"),
  address1: text("address1"),
  center: text("center"),
  contactPerson: text("contact_person"),
  districtName: text("district_name"),
  stateId: integer("state_id").references(() => states.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  idxBankName: index("idx_banks_name").on(t.bankName),
}));

export const expenseHeads = pgTable("expense_heads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  expenseType: text("expense_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accountGroups = pgTable("account_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  groupType: text("group_type"),
  suppressFlag: boolean("suppress_flag").default(false),
  parentGroupId: integer("parent_group_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const narrationTemplates = pgTable("narration_templates", {
  id: serial("id").primaryKey(),
  templateText: text("template_text").notNull(),
  voucherType: text("voucher_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const termsConditions = pgTable("terms_conditions", {
  id: serial("id").primaryKey(),
  termText: text("term_text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transporters = pgTable("transporters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address1: text("address1"),
  address2: text("address2"),
  cityId: integer("city_id").references(() => cities.id),
  pincode: text("pincode"),
  contactPerson: text("contact_person"),
  phoneOffice: text("phone_office"),
  phoneRes: text("phone_res"),
  mobile: text("mobile"),
  panNo: text("pan_no"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  idxTrptName: index("idx_transporters_name").on(t.name),
}));

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  vehicleType: text("vehicle_type").notNull().unique(),
  standardWeight: numeric("standard_weight", { precision: 15, scale: 3 }),
  approxWeightText: text("approx_weight_text"),
  minWeight: numeric("min_weight", { precision: 15, scale: 3 }),
  maxWeight: numeric("max_weight", { precision: 15, scale: 3 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const couriers = pgTable("couriers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address1: text("address1"),
  cityId: integer("city_id").references(() => cities.id),
  pincode: text("pincode"),
  phone: text("phone"),
  mobile: text("mobile"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const proprietors = pgTable("proprietors", {
  id: serial("id").primaryKey(),
  firmName: text("firm_name").notNull(),
  address1: text("address1"),
  address2: text("address2"),
  cityId: integer("city_id").references(() => cities.id),
  pincode: text("pincode"),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  phoneRes: text("phone_res"),
  mobile: text("mobile"),
  tinNo: text("tin_no"),
  panNo: text("pan_no"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const partyItemBrokerage = pgTable("party_item_brokerage", {
  id: serial("id").primaryKey(),
  partyId: integer("party_id").references(() => parties.id, { onDelete: "cascade" }).notNull(),
  commodityId: integer("commodity_id").references(() => commodities.id, { onDelete: "cascade" }).notNull(),
  packingWeight: numeric("packing_weight", { precision: 10, scale: 3 }),
  sellerBrokerageRate: numeric("seller_brokerage_rate", { precision: 10, scale: 2 }),
  sellerBrokerageType: text("seller_brokerage_type"),
  buyerBrokerageRate: numeric("buyer_brokerage_rate", { precision: 10, scale: 2 }),
  buyerBrokerageType: text("buyer_brokerage_type"),
}, (t) => ({
  unqPartyItemPkg: uniqueIndex("unq_party_item_pkg").on(t.partyId, t.commodityId, t.packingWeight),
  idxPartyId: index("idx_prt_item_brk_party_id").on(t.partyId),
  idxCommodityId: index("idx_prt_item_brk_commodity_id").on(t.commodityId),
}));
