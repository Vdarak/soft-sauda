import { pgTable, serial, integer, text, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { deliveryStatusEnum } from "./enums";
import { companies, fiscalYears, users } from "./00-auth-companies";
import { parties } from "./02-parties";
import { contractLines } from "./05-contracts";

// ==========================================
// 6. DELIVERIES DOMAIN
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
