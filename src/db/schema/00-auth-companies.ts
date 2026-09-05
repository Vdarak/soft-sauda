import { pgTable, serial, integer, text, timestamp, uniqueIndex, index, boolean, jsonb } from "drizzle-orm/pg-core";
import { userRoleEnum, auditActionEnum } from "./enums";

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
