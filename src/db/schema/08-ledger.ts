import { pgTable, serial, integer, text, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { companies, fiscalYears, users } from "./00-auth-companies";
import { parties } from "./02-parties";

// ==========================================
// 8. LEDGER DOMAIN
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
