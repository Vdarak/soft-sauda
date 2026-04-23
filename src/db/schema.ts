import { pgTable, serial, integer, text, numeric, timestamp, pgEnum, uniqueIndex, index, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ==========================================
// ENUMS
// ==========================================
export const partyRoleEnum = pgEnum('party_role', ['BUYER', 'SELLER', 'BUYER_BROKER', 'SELLER_BROKER']);
export const taxIdTypeEnum = pgEnum('tax_id_type', ['GSTIN', 'VAT_TIN', 'CST_TIN', 'CST_NO', 'PAN']);
export const contractStatusEnum = pgEnum('contract_status', ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']);
export const deliveryStatusEnum = pgEnum('delivery_status', ['PENDING', 'DISPATCHED', 'DELIVERED', 'CANCELLED']);
export const billBasisEnum = pgEnum('bill_basis', ['CONTRACT', 'DELIVERY', 'DIRECT', 'DALALI']);

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
  // Credit & Communication Fields
  creditLimit: numeric("credit_limit", { precision: 15, scale: 2 }),
  phone: text("phone"),
  smsMobile: text("sms_mobile"),
  mill: text("mill"),
  fax: text("fax"),
  emailIds: text("email_ids"),
  designation: text("designation"),
  // Audit & Status
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (t) => ({
  nameTrgmIdx: index("idx_parties_name_trgm").using("gin", sql`${t.name} gin_trgm_ops`)
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
}, (t) => ({
  nameTrgmIdx: index("idx_commodities_name_trgm").using("gin", sql`${t.name} gin_trgm_ops`)
}));

export const commodityPackaging = pgTable("commodity_packaging", {
  id: serial("id").primaryKey(),
  commodityId: integer("commodity_id").references(() => commodities.id, { onDelete: "cascade" }).notNull(),
  packingWeight: numeric("packing_weight", { precision: 10, scale: 3 }).notNull(),
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
  saudaNo: integer("sauda_no").notNull(),
  saudaBook: text("sauda_book").notNull(),
  saudaDate: timestamp("sauda_date").defaultNow().notNull(),
  status: contractStatusEnum("status").default('ACTIVE').notNull(),
  deliveryTerm: text("delivery_term"),
  customRemarks: text("custom_remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  unqSauda: uniqueIndex("unq_sauda_book_no").on(t.saudaBook, t.saudaNo)
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
  dispatchDate: timestamp("dispatch_date").defaultNow().notNull(),
  truckNo: text("truck_no"),
  transporterId: integer("transporter_id").references(() => parties.id),
  status: deliveryStatusEnum("status").default('PENDING').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
  billNo: text("bill_no").unique().notNull(),
  billDate: timestamp("bill_date").defaultNow().notNull(),
  partyId: integer("party_id").references(() => parties.id).notNull(),
  basis: billBasisEnum("basis").notNull(),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
  balanceAmount: numeric("balance_amount", { precision: 15, scale: 2 }).notNull(),
  creditDays: integer("credit_days"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
  partyId: integer("party_id").references(() => parties.id).notNull(),
  instrumentType: text("instrument_type").notNull(), // 'CHEQUE', 'NEFT', 'CASH'
  instrumentNo: text("instrument_no"),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  depositedBank: text("deposited_bank"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
  transactionDate: timestamp("transaction_date").defaultNow().notNull(),
  accountId: integer("account_id").references(() => parties.id).notNull(),
  sourceType: text("source_type").notNull(), // 'BILL', 'PAYMENT', 'MANUAL'
  sourceId: integer("source_id"),
  debit: numeric("debit", { precision: 15, scale: 2 }).default('0.00'),
  credit: numeric("credit", { precision: 15, scale: 2 }).default('0.00'),
  narration: text("narration"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  idxAccountId: index("idx_ledger_account_id").on(t.accountId),
  idxSourceType: index("idx_ledger_source_type").on(t.sourceType),
  idxTransDate: index("idx_ledger_transaction_date").on(t.transactionDate),
}));
