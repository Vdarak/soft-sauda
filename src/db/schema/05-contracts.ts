import { pgTable, serial, integer, text, numeric, timestamp, uniqueIndex, index, boolean } from "drizzle-orm/pg-core";
import { contractStatusEnum, paymentTermTypeEnum, partyRoleEnum } from "./enums";
import { companies, fiscalYears, users } from "./00-auth-companies";
import { cities } from "./01-locations";
import { parties } from "./02-parties";
import { commodities, commodityPackaging, brands } from "./03-commodities";
import { termsConditions, transporters } from "./04-masters";

// ==========================================
// 5. CONTRACTS / SAUDA DOMAIN
// (Flat 40+ Column Structure Preserved for Zero-Scroll Form Performance)
// ==========================================

export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  // Company & Fiscal Year Scoping
  companyId: integer("company_id").references(() => companies.id).notNull(),
  fiscalYearId: integer("fiscal_year_id").references(() => fiscalYears.id).notNull(),
  // Business & Voucher Fields
  saudaNo: integer("sauda_no").notNull(),
  saudaBook: text("sauda_book").notNull(),          // e.g. "SD"
  saudaPrefix: text("sauda_prefix"),
  saudaDate: timestamp("sauda_date").defaultNow().notNull(),
  status: contractStatusEnum("status").default('ACTIVE').notNull(),
  deliveryTerm: text("delivery_term"),
  // Delivery station & period
  fromCityId: integer("from_city_id").references(() => cities.id),
  toCityId: integer("to_city_id").references(() => cities.id),
  deliveryFromDate: text("delivery_from_date"),
  deliveryToDate: text("delivery_to_date"),
  deliveryDetails: text("delivery_details"),
  // Payment terms & Discount
  paymentTermType: paymentTermTypeEnum("payment_term_type").default('DISCOUNT'),
  paymentPercent: numeric("payment_percent", { precision: 5, scale: 2 }),
  paymentDays: integer("payment_days"),
  cashDiscountRate: numeric("cash_discount_rate", { precision: 10, scale: 2 }),
  paymentDetails: text("payment_details"),
  cFormRequired: boolean("c_form_required").default(false),
  deliveryDeadlineDate: timestamp("delivery_deadline_date"),
  approxWeight: numeric("approx_weight", { precision: 15, scale: 3 }),
  quantityTolerance: numeric("quantity_tolerance", { precision: 5, scale: 2 }),
  originStation: text("origin_station"),
  destinationStation: text("destination_station"),
  taxFormRequired: text("tax_form_required"),
  poNumber: text("po_number"),
  poDate: timestamp("po_date"),
  termId: integer("term_id").references(() => termsConditions.id),
  termsAndConditions: text("terms_and_conditions"),
  customRemarks: text("custom_remarks"),
  // Freight & Logistics
  truckNo: text("truck_no"),
  freightRate: numeric("freight_rate", { precision: 15, scale: 2 }),
  freightAmount: numeric("freight_amount", { precision: 15, scale: 2 }),
  freightAdvance: numeric("freight_advance", { precision: 15, scale: 2 }),
  transporterId: integer("transporter_id").references(() => transporters.id),
  shippingMark: text("shipping_mark"),
  weightTerms: text("weight_terms"),
  priceTerms: text("price_terms"),
  // Additions, Deductions & Bargain
  addition1Remark: text("addition_1_remark"),
  addition1Amount: numeric("addition_1_amount", { precision: 15, scale: 2 }),
  deduction1Remark: text("deduction_1_remark"),
  deduction1Amount: numeric("deduction_1_amount", { precision: 15, scale: 2 }),
  bargainAmount: numeric("bargain_amount", { precision: 15, scale: 2 }),
  totalBillAmount: numeric("total_bill_amount", { precision: 15, scale: 2 }),
  // Brokerage & Contact Overrides
  brokerageApplicable: boolean("brokerage_applicable").default(true),
  sellerContactPerson: text("seller_contact_person"),
  sellerBrokerContact: text("seller_broker_contact"),
  buyerContactPerson: text("buyer_contact_person"),
  buyerBrokerContact: text("buyer_broker_contact"),
  // Audit
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
}, (t) => ({
  unqSauda: uniqueIndex("unq_sauda_book_no").on(t.companyId, t.fiscalYearId, t.saudaBook, t.saudaNo),
  idxCompanyId: index("idx_contracts_company_id").on(t.companyId),
  idxFiscalYearId: index("idx_contracts_fiscal_year_id").on(t.fiscalYearId),
  idxCompanyFy: index("idx_contracts_company_fy").on(t.companyId, t.fiscalYearId),
}));

export const contractParties = pgTable("contract_parties", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").references(() => contracts.id, { onDelete: "cascade" }).notNull(),
  partyId: integer("party_id").references(() => parties.id).notNull(),
  role: partyRoleEnum("role").notNull(), 
}, (t) => ({
  idxContractId: index("idx_contract_parties_contract_id").on(t.contractId),
  idxPartyId: index("idx_contract_parties_party_id").on(t.partyId),
}));

export const contractLines = pgTable("contract_lines", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").references(() => contracts.id, { onDelete: "cascade" }).notNull(),
  lineNo: integer("line_no").default(1).notNull(),
  partyId: integer("party_id").references(() => parties.id),
  commodityId: integer("commodity_id").references(() => commodities.id).notNull(),
  packagingId: integer("packaging_id").references(() => commodityPackaging.id),
  brandId: integer("brand_id").references(() => brands.id),
  brand: text("brand"),
  innerPacking: text("inner_packing"),
  numberOfLorries: integer("number_of_lorries"),
  quantityBags: numeric("quantity_bags", { precision: 15, scale: 2 }),
  packWeight: numeric("pack_weight", { precision: 10, scale: 3 }),
  weightQuintals: numeric("weight_quintals", { precision: 15, scale: 3 }).notNull(),
  dispatchedWeight: numeric("dispatched_weight", { precision: 15, scale: 3 }).default('0.000'),
  balanceWeight: numeric("balance_weight", { precision: 15, scale: 3 }),
  grossOrNet: text("gross_or_net").default('G'),
  rate: numeric("rate", { precision: 15, scale: 2 }).notNull(),
  ratePerUnit: numeric("rate_per_unit", { precision: 15, scale: 2 }),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  // Brokerage per line
  sellerBrokerageRate: numeric("seller_brokerage_rate", { precision: 10, scale: 2 }),
  sellerBrokerageAmount: numeric("seller_brokerage_amount", { precision: 15, scale: 2 }),
  buyerBrokerageRate: numeric("buyer_brokerage_rate", { precision: 10, scale: 2 }),
  buyerBrokerageAmount: numeric("buyer_brokerage_amount", { precision: 15, scale: 2 }),
  linkedBillId: integer("linked_bill_id"),
}, (t) => ({
  idxContractId: index("idx_contract_lines_contract_id").on(t.contractId),
  idxCommodityId: index("idx_contract_lines_commodity_id").on(t.commodityId),
}));
