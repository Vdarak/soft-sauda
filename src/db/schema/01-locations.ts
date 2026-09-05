import { pgTable, serial, integer, text, uniqueIndex, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ==========================================
// 1. LOCATION MASTERS (State / District / City)
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
