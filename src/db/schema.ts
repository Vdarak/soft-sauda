import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const contracts = sqliteTable("contracts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  saudaNo: integer("sauda_no").unique().notNull(), // The user-facing contract ID
  saudaBook: text("sauda_book"),
  saudaDate: text("sauda_date").default(sql`CURRENT_TIMESTAMP`).notNull(),
  
  // Seller details
  sellerName: text("seller_name").notNull(),
  sellerGstin: text("seller_gstin"),
  sellerTin: text("seller_tin"),
  sellerCst: text("seller_cst"),
  sellerBroker: text("seller_broker"),
  
  // Buyer details
  buyerName: text("buyer_name").notNull(),
  buyerGstin: text("buyer_gstin"),
  buyerTin: text("buyer_tin"),
  buyerCst: text("buyer_cst"),
  buyerBroker: text("buyer_broker"),
  
  // Trade details
  commodity: text("commodity").notNull(),
  brand: text("brand"),
  packaging: text("packaging"),
  weight: real("weight"),
  rate: real("rate"),
  amount: real("amount"),
  
  // Terms
  deliveryTerm: text("delivery_term"),
  validFrom: text("valid_from"),
  validTo: text("valid_to"),
  cForm: text("cform"), // Flag/field for C-Form

  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const deliveries = sqliteTable("deliveries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contractId: integer("contract_id").references(() => contracts.id).notNull(),
  dispatchDate: text("dispatch_date").default(sql`CURRENT_TIMESTAMP`).notNull(),
  truckNo: text("truck_no"),
  quantity: real("quantity"),
  weight: real("weight"),
  freightAdvance: real("freight_advance"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const bills = sqliteTable("bills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  deliveryId: integer("delivery_id").references(() => deliveries.id),
  contractId: integer("contract_id").references(() => contracts.id).notNull(),
  billNo: text("bill_no").unique(),
  billDate: text("bill_date"),
  billAmount: real("bill_amount"),
  amountReceived: real("amount_received").default(0.00),
  deductions: real("deductions").default(0.00),
  balanceAmount: real("balance_amount"),
  creditDays: integer("credit_days"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  billId: integer("bill_id").references(() => bills.id),
  paymentDate: text("payment_date").default(sql`CURRENT_TIMESTAMP`).notNull(),
  instrumentType: text("instrument_type"),
  instrumentNo: text("instrument_no"),
  instrumentDate: text("instrument_date"),
  amount: real("amount").notNull(),
  depositedBank: text("deposited_bank"),
  courierTracking: text("courier_tracking"),
  voucherType: text("voucher_type"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const ledger = sqliteTable("ledger", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transactionDate: text("transaction_date").default(sql`CURRENT_TIMESTAMP`).notNull(),
  voucherRef: integer("voucher_ref"),
  narration: text("narration"),
  accountId: text("account_id").notNull(),
  debit: real("debit").default(0.00),
  credit: real("credit").default(0.00),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});
