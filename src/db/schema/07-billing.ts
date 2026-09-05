import { pgTable, serial, integer, text, numeric, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { billBasisEnum } from "./enums";
import { companies, fiscalYears, users } from "./00-auth-companies";
import { parties } from "./02-parties";
import { banks, couriers, expenseHeads } from "./04-masters";

// ==========================================
// 7. BILLING & PAYMENTS DOMAIN
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
  instrumentType: text("instrument_type").notNull(), // 'CHEQUE', 'DD', 'NEFT', 'RTGS', 'CASH'
  instrumentNo: text("instrument_no"),
  instrumentDate: timestamp("instrument_date"),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  depositBankId: integer("deposit_bank_id").references(() => banks.id),
  depositedBank: text("deposited_bank"),
  depositAccountNo: text("deposit_account_no"),
  courierId: integer("courier_id").references(() => couriers.id),
  courierReceiptNo: text("courier_receipt_no"),
  courierCharges: numeric("courier_charges", { precision: 15, scale: 2 }),
  remarks1: text("remarks1"),
  remarks2: text("remarks2"),
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

export const outstanding = pgTable("outstanding", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  fiscalYearId: integer("fiscal_year_id").references(() => fiscalYears.id).notNull(),
  partyId: integer("party_id").references(() => parties.id).notNull(),
  billNo: text("bill_no").notNull(),
  poDate: text("po_date"),
  billAmount: numeric("bill_amount", { precision: 15, scale: 2 }).notNull(),
  outstandingAmount: numeric("outstanding_amount", { precision: 15, scale: 2 }).notNull(),
  receivedAmount: numeric("received_amount", { precision: 15, scale: 2 }).default('0.00'),
  expenseAmount: numeric("expense_amount", { precision: 15, scale: 2 }).default('0.00'),
  clearedAmount: numeric("cleared_amount", { precision: 15, scale: 2 }).default('0.00'),
  balanceAmount: numeric("balance_amount", { precision: 15, scale: 2 }).notNull(),
  dueDate: timestamp("due_date"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  idxPartyId: index("idx_outstanding_party_id").on(t.partyId),
  idxCompanyFy: index("idx_outstanding_company_fy").on(t.companyId, t.fiscalYearId),
}));

export const outstandingDetails = pgTable("outstanding_details", {
  id: serial("id").primaryKey(),
  outstandingId: integer("outstanding_id").references(() => outstanding.id, { onDelete: "cascade" }).notNull(),
  expenseHeadId: integer("expense_head_id").references(() => expenseHeads.id),
  expenseRate: numeric("expense_rate", { precision: 10, scale: 2 }),
  expenseAmount: numeric("expense_amount", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
