import { pgTable, serial, integer, text, numeric, timestamp, pgEnum, uniqueIndex, index, boolean, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ==========================================
// ENUMS
// ==========================================
export const partyRoleEnum = pgEnum('party_role', ['BUYER', 'SELLER', 'BUYER_BROKER', 'SELLER_BROKER']);
export const taxIdTypeEnum = pgEnum('tax_id_type', ['GSTIN', 'VAT_TIN', 'CST_TIN', 'CST_NO', 'PAN']);
export const contractStatusEnum = pgEnum('contract_status', ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']);
export const deliveryStatusEnum = pgEnum('delivery_status', ['PENDING', 'DISPATCHED', 'DELIVERED', 'CANCELLED']);
export const billBasisEnum = pgEnum('bill_basis', ['CONTRACT', 'DELIVERY', 'DIRECT', 'DALALI']);
export const paymentTermTypeEnum = pgEnum('payment_term_type', ['DISCOUNT', 'CREDIT', 'PAYMENT']);
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'EMPLOYEE']);
export const auditActionEnum = pgEnum('audit_action', ['CREATE', 'UPDATE', 'DELETE']);

// Marketplace enums (used by the public marketplace domain at the end of this file)
export const volatilityTierEnum = pgEnum('volatility_tier', ['LOW', 'MEDIUM', 'HIGH']);
export const memberRoleEnum = pgEnum('member_role', ['BUYER', 'SELLER', 'BOTH']);
export const listingTypeEnum = pgEnum('listing_type', ['OPEN', 'TENDER']);
export const listingDirectionEnum = pgEnum('listing_direction', ['SELL', 'BUY']);
export const listingStatusEnum = pgEnum('listing_status', ['ACTIVE', 'SOLD', 'CLOSED']);
export const bidStatusEnum = pgEnum('bid_status', ['PENDING', 'ACCEPTED', 'REJECTED']);
export const chatStatusEnum = pgEnum('chat_status', ['NEGOTIATING', 'AGREED', 'CANCELLED']);

// ==========================================
// 0. COMPANIES & USERS & FISCAL YEARS
// ==========================================

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  shortCode: text("short_code").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const fiscalYears = pgTable("fiscal_years", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  label: text("label").notNull(),           // e.g. "FY 2025-26"
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isCurrent: boolean("is_current").default(false).notNull(),
  isLocked: boolean("is_locked").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  unqCompanyLabel: uniqueIndex("unq_fy_company_label").on(t.companyId, t.label),
  idxCompanyId: index("idx_fy_company_id").on(t.companyId),
}));

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name"),
  role: userRoleEnum("role").default('EMPLOYEE').notNull(),
  permissions: jsonb("permissions").$type<Record<string, Record<string, boolean>>>(),
  isActive: boolean("is_active").default(true).notNull(),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userCompanyAccess = pgTable("user_company_access", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
}, (t) => ({
  unqUserCompany: uniqueIndex("unq_user_company").on(t.userId, t.companyId),
}));

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  companyId: integer("company_id").references(() => companies.id),
  action: auditActionEnum("action").notNull(),
  entityType: text("entity_type").notNull(),  // 'contract', 'delivery', etc.
  entityId: integer("entity_id"),
  changes: jsonb("changes").$type<Record<string, any>>(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  idxUserId: index("idx_audit_log_user_id").on(t.userId),
  idxCompanyId: index("idx_audit_log_company_id").on(t.companyId),
  idxEntityType: index("idx_audit_log_entity").on(t.entityType, t.entityId),
  idxCreatedAt: index("idx_audit_log_created_at").on(t.createdAt),
}));

// ==========================================
// 1. PARTIES DOMAIN
// ==========================================
export const parties = pgTable("parties", {
  id: serial("id").primaryKey(),
  // Identity Fields
  name: text("name").notNull().unique(),
  address: text("address"),
  landmark: text("landmark"),
  place: text("place"),
  stateName: text("state_name"),
  pinCode: text("pin_code"),
  cityId: integer("city_id"),  // FK to cities table (added in City Master)
  // Credit & Communication Fields
  creditLimit: numeric("credit_limit", { precision: 15, scale: 2 }),
  phone: text("phone"),
  phoneRes: text("phone_res"),
  smsMobile: text("sms_mobile"),
  mill: text("mill"),
  fax: text("fax"),
  emailIds: text("email_ids"),
  designation: text("designation"),
  // Sharing & Isolation (future-proof)
  isShared: boolean("is_shared").default(true).notNull(),
  companyId: integer("company_id").references(() => companies.id),  // nullable: only set when isShared=false
  // Audit & Status
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
}, (t) => ({
  nameTrgmIdx: index("idx_parties_name_trgm").using("gin", sql`${t.name} gin_trgm_ops`),
  idxCompanyId: index("idx_parties_company_id").on(t.companyId),
}));

export const partyRoles = pgTable("party_roles", {
  id: serial("id").primaryKey(),
  partyId: integer("party_id").references(() => parties.id, { onDelete: "cascade" }).notNull(),
  role: partyRoleEnum("role").notNull(),
}, (t) => ({
  uniqueRole: uniqueIndex("unq_party_role").on(t.partyId, t.role),
  idxPartyId: index("idx_party_roles_party_id").on(t.partyId),
}));

export const partyTaxIds = pgTable("party_tax_ids", {
  id: serial("id").primaryKey(),
  partyId: integer("party_id").references(() => parties.id, { onDelete: "cascade" }).notNull(),
  taxType: taxIdTypeEnum("tax_type").notNull(),
  taxValue: text("tax_value").notNull(),
}, (t) => ({
  idxPartyId: index("idx_party_tax_ids_party_id").on(t.partyId),
}));

export const partyDeliveryAddresses = pgTable("party_delivery_addresses", {
  id: serial("id").primaryKey(),
  partyId: integer("party_id").references(() => parties.id, { onDelete: "cascade" }).notNull(),
  addressLine: text("address_line").notNull(),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
});

export const partyBankDetails = pgTable("party_bank_details", {
  id: serial("id").primaryKey(),
  partyId: integer("party_id").references(() => parties.id, { onDelete: "cascade" }).notNull(),
  bankName: text("bank_name"),
  accountNo: text("account_no"),
  ifscCode: text("ifsc_code"),
  branch: text("branch"),
});

export const partyContacts = pgTable("party_contacts", {
  id: serial("id").primaryKey(),
  partyId: integer("party_id").references(() => parties.id, { onDelete: "cascade" }).notNull(),
  contactName: text("contact_name").notNull(),
  contactNumber: text("contact_number").notNull(),
  emailId: text("email_id"),
  designation: text("designation"),
});

// ==========================================
// 2. COMMODITIES DOMAIN
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

// ==========================================
// 3. CONTRACTS / SAUDA DOMAIN
// ==========================================
export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  // Company & Fiscal Year Scoping
  companyId: integer("company_id").references(() => companies.id).notNull(),
  fiscalYearId: integer("fiscal_year_id").references(() => fiscalYears.id).notNull(),
  // Business Fields
  saudaNo: integer("sauda_no").notNull(),
  saudaBook: text("sauda_book").notNull(),
  saudaPrefix: text("sauda_prefix"),
  saudaDate: timestamp("sauda_date").defaultNow().notNull(),
  status: contractStatusEnum("status").default('ACTIVE').notNull(),
  deliveryTerm: text("delivery_term"),
  // Payment terms (WS1)
  paymentTermType: paymentTermTypeEnum("payment_term_type").default('DISCOUNT'),
  paymentPercent: numeric("payment_percent", { precision: 5, scale: 2 }),
  paymentDays: integer("payment_days"),
  deliveryDeadlineDate: timestamp("delivery_deadline_date"),
  approxWeight: numeric("approx_weight", { precision: 15, scale: 3 }),
  quantityTolerance: numeric("quantity_tolerance", { precision: 5, scale: 2 }),
  originStation: text("origin_station"),
  destinationStation: text("destination_station"),
  taxFormRequired: text("tax_form_required"),
  poNumber: text("po_number"),
  poDate: timestamp("po_date"),
  termsAndConditions: text("terms_and_conditions"),
  customRemarks: text("custom_remarks"),
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
  commodityId: integer("commodity_id").references(() => commodities.id).notNull(),
  packagingId: integer("packaging_id").references(() => commodityPackaging.id),
  brand: text("brand"),
  numberOfLorries: integer("number_of_lorries"),  // WS3: expected number of trucks
  quantityBags: numeric("quantity_bags", { precision: 15, scale: 2 }),
  weightQuintals: numeric("weight_quintals", { precision: 15, scale: 3 }).notNull(),
  rate: numeric("rate", { precision: 15, scale: 2 }).notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
}, (t) => ({
  idxContractId: index("idx_contract_lines_contract_id").on(t.contractId),
  idxCommodityId: index("idx_contract_lines_commodity_id").on(t.commodityId),
}));

// ==========================================
// 4. DELIVERIES DOMAIN
// ==========================================
export const deliveries = pgTable("deliveries", {
  id: serial("id").primaryKey(),
  // Company & Fiscal Year Scoping
  companyId: integer("company_id").references(() => companies.id).notNull(),
  fiscalYearId: integer("fiscal_year_id").references(() => fiscalYears.id).notNull(),
  // Business Fields
  dispatchDate: timestamp("dispatch_date").defaultNow().notNull(),
  truckNo: text("truck_no"),
  billNo: text("bill_no"),  // WS2: seller's bill number accompanying the truck
  carrierBillDate: timestamp("carrier_bill_date"),
  transporterId: integer("transporter_id").references(() => parties.id),
  advancePaymentCollected: numeric("advance_payment_collected", { precision: 15, scale: 2 }),
  status: deliveryStatusEnum("status").default('PENDING').notNull(),
  // Audit
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
}, (t) => ({
  idxCompanyId: index("idx_deliveries_company_id").on(t.companyId),
  idxFiscalYearId: index("idx_deliveries_fiscal_year_id").on(t.fiscalYearId),
  idxCompanyFy: index("idx_deliveries_company_fy").on(t.companyId, t.fiscalYearId),
}));

export const deliveryLines = pgTable("delivery_lines", {
  id: serial("id").primaryKey(),
  deliveryId: integer("delivery_id").references(() => deliveries.id, { onDelete: "cascade" }).notNull(),
  contractLineId: integer("contract_line_id").references(() => contractLines.id).notNull(),
  dispatchedBags: numeric("dispatched_bags", { precision: 15, scale: 2 }),
  dispatchedWeight: numeric("dispatched_weight", { precision: 15, scale: 3 }).notNull(),
}, (t) => ({
  idxDeliveryId: index("idx_delivery_lines_delivery_id").on(t.deliveryId),
  idxContractLineId: index("idx_delivery_lines_contract_line_id").on(t.contractLineId),
}));

export const deliveryCharges = pgTable("delivery_charges", {
  id: serial("id").primaryKey(),
  deliveryId: integer("delivery_id").references(() => deliveries.id, { onDelete: "cascade" }).notNull(),
  chargeType: text("charge_type").notNull(), // 'FREIGHT_ADVANCE', 'ADD', 'LESS'
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
});

// ==========================================
// 5. BILLING & PAYMENTS DOMAIN
// ==========================================
export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  // Company & Fiscal Year Scoping
  companyId: integer("company_id").references(() => companies.id).notNull(),
  fiscalYearId: integer("fiscal_year_id").references(() => fiscalYears.id).notNull(),
  // Business Fields
  billNo: text("bill_no").notNull(),
  billDate: timestamp("bill_date").defaultNow().notNull(),
  partyId: integer("party_id").references(() => parties.id).notNull(),
  basis: billBasisEnum("basis").notNull(),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
  balanceAmount: numeric("balance_amount", { precision: 15, scale: 2 }).notNull(),
  creditDays: integer("credit_days"),
  // Audit
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
}, (t) => ({
  unqBillNo: uniqueIndex("unq_bill_no_company_fy").on(t.companyId, t.fiscalYearId, t.billNo),
  idxCompanyId: index("idx_bills_company_id").on(t.companyId),
  idxFiscalYearId: index("idx_bills_fiscal_year_id").on(t.fiscalYearId),
  idxCompanyFy: index("idx_bills_company_fy").on(t.companyId, t.fiscalYearId),
}));

export const billLines = pgTable("bill_lines", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").references(() => bills.id, { onDelete: "cascade" }).notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  referenceType: text("reference_type"), // 'DELIVERY', 'CONTRACT', 'CHARGE'
  referenceId: integer("reference_id"),
}, (t) => ({
  idxBillId: index("idx_bill_lines_bill_id").on(t.billId),
}));

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  // Company & Fiscal Year Scoping
  companyId: integer("company_id").references(() => companies.id).notNull(),
  fiscalYearId: integer("fiscal_year_id").references(() => fiscalYears.id).notNull(),
  // Business Fields
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
  partyId: integer("party_id").references(() => parties.id).notNull(),
  instrumentType: text("instrument_type").notNull(), // 'CHEQUE', 'NEFT', 'CASH'
  instrumentNo: text("instrument_no"),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  depositedBank: text("deposited_bank"),
  // Audit
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
}, (t) => ({
  idxCompanyId: index("idx_payments_company_id").on(t.companyId),
  idxFiscalYearId: index("idx_payments_fiscal_year_id").on(t.fiscalYearId),
  idxCompanyFy: index("idx_payments_company_fy").on(t.companyId, t.fiscalYearId),
}));

export const paymentAllocations = pgTable("payment_allocations", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").references(() => payments.id, { onDelete: "cascade" }).notNull(),
  billId: integer("bill_id").references(() => bills.id).notNull(),
  allocatedAmount: numeric("allocated_amount", { precision: 15, scale: 2 }).notNull(),
}, (t) => ({
  idxPaymentId: index("idx_payment_alloc_payment_id").on(t.paymentId),
  idxBillId: index("idx_payment_alloc_bill_id").on(t.billId),
}));

// ==========================================
// 6. LEDGER DOMAIN
// ==========================================
export const ledger = pgTable("ledger", {
  id: serial("id").primaryKey(),
  // Company & Fiscal Year Scoping
  companyId: integer("company_id").references(() => companies.id).notNull(),
  fiscalYearId: integer("fiscal_year_id").references(() => fiscalYears.id).notNull(),
  // Business Fields
  transactionDate: timestamp("transaction_date").defaultNow().notNull(),
  accountId: integer("account_id").references(() => parties.id).notNull(),
  sourceType: text("source_type").notNull(), // 'BILL', 'PAYMENT', 'MANUAL'
  sourceId: integer("source_id"),
  debit: numeric("debit", { precision: 15, scale: 2 }).default('0.00'),
  credit: numeric("credit", { precision: 15, scale: 2 }).default('0.00'),
  narration: text("narration"),
  // Audit
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
}, (t) => ({
  idxAccountId: index("idx_ledger_account_id").on(t.accountId),
  idxSourceType: index("idx_ledger_source_type").on(t.sourceType),
  idxTransDate: index("idx_ledger_transaction_date").on(t.transactionDate),
  idxCompanyId: index("idx_ledger_company_id").on(t.companyId),
  idxFiscalYearId: index("idx_ledger_fiscal_year_id").on(t.fiscalYearId),
  idxCompanyFy: index("idx_ledger_company_fy").on(t.companyId, t.fiscalYearId),
}));

// ==========================================
// 7. LOCATION MASTERS (City / District / State)
// ==========================================
export const states = pgTable("states", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const districts = pgTable("districts", {
  id: serial("id").primaryKey(),
  stateId: integer("state_id").references(() => states.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
}, (t) => ({
  unqDistrictState: uniqueIndex("unq_district_state").on(t.stateId, t.name),
}));

export const cities = pgTable("cities", {
  id: serial("id").primaryKey(),
  districtId: integer("district_id").references(() => districts.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  pincode: text("pincode"),
  stdCode: text("std_code"),
}, (t) => ({
  nameTrgmIdx: index("idx_cities_name_trgm").using("gin", sql`${t.name} gin_trgm_ops`),
}));

// ==========================================================================
// 6. MARKETPLACE DOMAIN (public marketplace — separate identity realm)
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  idxPartyId: index("idx_members_party_id").on(t.partyId),
}));

export const listings = pgTable("listings", {
  id: serial("id").primaryKey(),
  // Seller member. Nullable so staff can publish tenders (M5) with no member owner.
  memberId: integer("member_id").references(() => members.id, { onDelete: "cascade" }),
  listingType: listingTypeEnum("listing_type").default('OPEN').notNull(),
  direction: listingDirectionEnum("direction").default('SELL').notNull(),
  // What's on offer — reuse the existing commodity masters.
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  idxRoomId: index("idx_chat_messages_room_id").on(t.roomId),
}));

