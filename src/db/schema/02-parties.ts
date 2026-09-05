import { pgTable, serial, integer, text, numeric, timestamp, uniqueIndex, index, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { partyRoleEnum, taxIdTypeEnum } from "./enums";
import { companies, users } from "./00-auth-companies";

// ==========================================
// 2. PARTIES DOMAIN
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
  cityId: integer("city_id"),  // FK to cities table
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
