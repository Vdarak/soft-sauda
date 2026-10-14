CREATE TYPE "public"."audit_action" AS ENUM('CREATE', 'UPDATE', 'DELETE');--> statement-breakpoint
CREATE TYPE "public"."bid_status" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."bill_basis" AS ENUM('CONTRACT', 'DELIVERY', 'DIRECT', 'DALALI');--> statement-breakpoint
CREATE TYPE "public"."chat_status" AS ENUM('NEGOTIATING', 'AGREED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."contract_status" AS ENUM('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('PENDING', 'DISPATCHED', 'DELIVERED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."listing_direction" AS ENUM('SELL', 'BUY');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('ACTIVE', 'SOLD', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."listing_type" AS ENUM('OPEN', 'TENDER');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('BUYER', 'SELLER', 'BOTH');--> statement-breakpoint
CREATE TYPE "public"."party_role" AS ENUM('BUYER', 'SELLER', 'BUYER_BROKER', 'SELLER_BROKER');--> statement-breakpoint
CREATE TYPE "public"."payment_term_type" AS ENUM('DISCOUNT', 'CREDIT', 'PAYMENT');--> statement-breakpoint
CREATE TYPE "public"."tax_id_type" AS ENUM('GSTIN', 'VAT_TIN', 'CST_TIN', 'CST_NO', 'PAN');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'EMPLOYEE');--> statement-breakpoint
CREATE TYPE "public"."volatility_tier" AS ENUM('LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"company_id" integer,
	"action" "audit_action" NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer,
	"changes" jsonb,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"department_id" integer,
	"legacy_cocode" integer,
	"name" text NOT NULL,
	"short_code" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_name_unique" UNIQUE("name"),
	CONSTRAINT "companies_short_code_unique" UNIQUE("short_code")
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_code" text NOT NULL,
	"icon" text,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "departments_name_unique" UNIQUE("name"),
	CONSTRAINT "departments_short_code_unique" UNIQUE("short_code")
);
--> statement-breakpoint
CREATE TABLE "fiscal_years" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"label" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_company_access" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"company_id" integer NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text,
	"role" "user_role" DEFAULT 'EMPLOYEE' NOT NULL,
	"permissions" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"district_id" integer NOT NULL,
	"name" text NOT NULL,
	"pincode" text,
	"std_code" text
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"id" serial PRIMARY KEY NOT NULL,
	"state_id" integer NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "states" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "states_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "parties" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"landmark" text,
	"place" text,
	"state_name" text,
	"pin_code" text,
	"city_id" integer,
	"credit_limit" numeric(15, 2),
	"phone" text,
	"phone_res" text,
	"sms_mobile" text,
	"mill" text,
	"fax" text,
	"email_ids" text,
	"designation" text,
	"is_shared" boolean DEFAULT true NOT NULL,
	"company_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" integer,
	"updated_by" integer,
	CONSTRAINT "parties_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "party_bank_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"party_id" integer NOT NULL,
	"bank_name" text,
	"account_no" text,
	"ifsc_code" text,
	"branch" text
);
--> statement-breakpoint
CREATE TABLE "party_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"party_id" integer NOT NULL,
	"contact_name" text NOT NULL,
	"contact_number" text NOT NULL,
	"email_id" text,
	"designation" text
);
--> statement-breakpoint
CREATE TABLE "party_delivery_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"party_id" integer NOT NULL,
	"address_line" text NOT NULL,
	"city" text,
	"state" text,
	"pincode" text
);
--> statement-breakpoint
CREATE TABLE "party_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"party_id" integer NOT NULL,
	"role" "party_role" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "party_tax_ids" (
	"id" serial PRIMARY KEY NOT NULL,
	"party_id" integer NOT NULL,
	"tax_type" "tax_id_type" NOT NULL,
	"tax_value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_packaging" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"pack_weight" numeric(10, 3),
	"inner_packing" text
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_registered" boolean DEFAULT false,
	"reg_no" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "brands_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "commodities" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer,
	"name" text NOT NULL,
	"description" text,
	"short_name" text,
	"unit" text,
	"hsn_code" text,
	"volatility_tier" "volatility_tier" DEFAULT 'MEDIUM',
	"is_shared" boolean DEFAULT true NOT NULL,
	"company_id" integer,
	CONSTRAINT "commodities_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "commodity_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "commodity_groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "commodity_packaging" (
	"id" serial PRIMARY KEY NOT NULL,
	"commodity_id" integer NOT NULL,
	"packing_weight" numeric(10, 3) NOT NULL,
	"packing_weight_2" numeric(10, 3),
	"packing_type" text NOT NULL,
	"seller_brokerage_rate" numeric(10, 2),
	"seller_brokerage_type" text,
	"buyer_brokerage_rate" numeric(10, 2),
	"buyer_brokerage_type" text
);
--> statement-breakpoint
CREATE TABLE "commodity_specifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"commodity_id" integer NOT NULL,
	"specification" text NOT NULL,
	"spec_value" numeric(10, 2),
	"min_max" text,
	"remarks" text
);
--> statement-breakpoint
CREATE TABLE "account_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"group_type" text,
	"suppress_flag" boolean DEFAULT false,
	"parent_group_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "account_groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "banks" (
	"id" serial PRIMARY KEY NOT NULL,
	"bank_name" text NOT NULL,
	"branch" text,
	"ifsc_code" text,
	"micr_code" text,
	"address" text,
	"address1" text,
	"center" text,
	"contact_person" text,
	"district_name" text,
	"state_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "couriers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address1" text,
	"city_id" integer,
	"pincode" text,
	"phone" text,
	"mobile" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_heads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"expense_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "expense_heads_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "narration_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_text" text NOT NULL,
	"voucher_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "party_item_brokerage" (
	"id" serial PRIMARY KEY NOT NULL,
	"party_id" integer NOT NULL,
	"commodity_id" integer NOT NULL,
	"packing_weight" numeric(10, 3),
	"seller_brokerage_rate" numeric(10, 2),
	"seller_brokerage_type" text,
	"buyer_brokerage_rate" numeric(10, 2),
	"buyer_brokerage_type" text
);
--> statement-breakpoint
CREATE TABLE "proprietors" (
	"id" serial PRIMARY KEY NOT NULL,
	"firm_name" text NOT NULL,
	"address1" text,
	"address2" text,
	"city_id" integer,
	"pincode" text,
	"contact_person" text,
	"phone" text,
	"phone_res" text,
	"mobile" text,
	"tin_no" text,
	"pan_no" text,
	"email" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "terms_conditions" (
	"id" serial PRIMARY KEY NOT NULL,
	"term_text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transporters" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address1" text,
	"address2" text,
	"city_id" integer,
	"pincode" text,
	"contact_person" text,
	"phone_office" text,
	"phone_res" text,
	"mobile" text,
	"pan_no" text,
	"email" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_type" text NOT NULL,
	"standard_weight" numeric(15, 3),
	"approx_weight_text" text,
	"min_weight" numeric(15, 3),
	"max_weight" numeric(15, 3),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_vehicle_type_unique" UNIQUE("vehicle_type")
);
--> statement-breakpoint
CREATE TABLE "contract_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"contract_id" integer NOT NULL,
	"narration" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"contract_id" integer NOT NULL,
	"line_no" integer DEFAULT 1 NOT NULL,
	"party_id" integer,
	"commodity_id" integer NOT NULL,
	"packaging_id" integer,
	"brand_id" integer,
	"brand" text,
	"inner_packing" text,
	"number_of_lorries" integer,
	"quantity_bags" numeric(15, 2),
	"pack_weight" numeric(10, 3),
	"weight_quintals" numeric(15, 3) NOT NULL,
	"dispatched_weight" numeric(15, 3) DEFAULT '0.000',
	"balance_weight" numeric(15, 3),
	"gross_or_net" text DEFAULT 'G',
	"rate" numeric(15, 2) NOT NULL,
	"rate_per_unit" numeric(15, 2),
	"amount" numeric(15, 2) NOT NULL,
	"seller_brokerage_rate" numeric(10, 2),
	"seller_brokerage_amount" numeric(15, 2),
	"buyer_brokerage_rate" numeric(10, 2),
	"buyer_brokerage_amount" numeric(15, 2),
	"linked_bill_id" integer
);
--> statement-breakpoint
CREATE TABLE "contract_parties" (
	"id" serial PRIMARY KEY NOT NULL,
	"contract_id" integer NOT NULL,
	"party_id" integer NOT NULL,
	"role" "party_role" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_specifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"contract_id" integer NOT NULL,
	"spec_name" text NOT NULL,
	"spec_value" numeric(10, 2),
	"min_max" text,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_terms" (
	"id" serial PRIMARY KEY NOT NULL,
	"contract_id" integer NOT NULL,
	"narration" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"fiscal_year_id" integer NOT NULL,
	"sauda_no" integer NOT NULL,
	"sauda_book" text NOT NULL,
	"sauda_prefix" text,
	"sauda_date" timestamp DEFAULT now() NOT NULL,
	"status" "contract_status" DEFAULT 'ACTIVE' NOT NULL,
	"delivery_term" text,
	"from_city_id" integer,
	"to_city_id" integer,
	"delivery_from_date" text,
	"delivery_to_date" text,
	"delivery_details" text,
	"payment_term_type" "payment_term_type" DEFAULT 'DISCOUNT',
	"payment_percent" numeric(5, 2),
	"payment_days" integer,
	"cash_discount_rate" numeric(10, 2),
	"payment_details" text,
	"c_form_required" boolean DEFAULT false,
	"delivery_deadline_date" timestamp,
	"approx_weight" numeric(15, 3),
	"quantity_tolerance" numeric(5, 2),
	"origin_station" text,
	"destination_station" text,
	"tax_form_required" text,
	"po_number" text,
	"po_date" timestamp,
	"term_id" integer,
	"terms_and_conditions" text,
	"custom_remarks" text,
	"truck_no" text,
	"freight_rate" numeric(15, 2),
	"freight_amount" numeric(15, 2),
	"freight_advance" numeric(15, 2),
	"transporter_id" integer,
	"shipping_mark" text,
	"weight_terms" text,
	"price_terms" text,
	"addition_1_remark" text,
	"addition_1_amount" numeric(15, 2),
	"deduction_1_remark" text,
	"deduction_1_amount" numeric(15, 2),
	"bargain_amount" numeric(15, 2),
	"total_bill_amount" numeric(15, 2),
	"brokerage_applicable" boolean DEFAULT true,
	"seller_contact_person" text,
	"seller_broker_contact" text,
	"buyer_contact_person" text,
	"buyer_broker_contact" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"fiscal_year_id" integer NOT NULL,
	"dispatch_date" timestamp DEFAULT now() NOT NULL,
	"truck_no" text,
	"bill_no" text,
	"carrier_bill_date" timestamp,
	"transporter_id" integer,
	"advance_payment_collected" numeric(15, 2),
	"status" "delivery_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "delivery_charges" (
	"id" serial PRIMARY KEY NOT NULL,
	"delivery_id" integer NOT NULL,
	"charge_type" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"delivery_id" integer NOT NULL,
	"contract_line_id" integer NOT NULL,
	"dispatched_bags" numeric(15, 2),
	"dispatched_weight" numeric(15, 3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bill_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"bill_id" integer NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"reference_type" text,
	"reference_id" integer
);
--> statement-breakpoint
CREATE TABLE "bills" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"fiscal_year_id" integer NOT NULL,
	"bill_no" text NOT NULL,
	"bill_date" timestamp DEFAULT now() NOT NULL,
	"party_id" integer NOT NULL,
	"basis" "bill_basis" NOT NULL,
	"total_amount" numeric(15, 2) NOT NULL,
	"balance_amount" numeric(15, 2) NOT NULL,
	"credit_days" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "outstanding" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"fiscal_year_id" integer NOT NULL,
	"party_id" integer NOT NULL,
	"bill_no" text NOT NULL,
	"po_date" text,
	"bill_amount" numeric(15, 2) NOT NULL,
	"outstanding_amount" numeric(15, 2) NOT NULL,
	"received_amount" numeric(15, 2) DEFAULT '0.00',
	"expense_amount" numeric(15, 2) DEFAULT '0.00',
	"cleared_amount" numeric(15, 2) DEFAULT '0.00',
	"balance_amount" numeric(15, 2) NOT NULL,
	"due_date" timestamp,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outstanding_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"outstanding_id" integer NOT NULL,
	"expense_head_id" integer,
	"expense_rate" numeric(10, 2),
	"expense_amount" numeric(15, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_id" integer NOT NULL,
	"bill_id" integer NOT NULL,
	"allocated_amount" numeric(15, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"fiscal_year_id" integer NOT NULL,
	"payment_date" timestamp DEFAULT now() NOT NULL,
	"party_id" integer NOT NULL,
	"instrument_type" text NOT NULL,
	"instrument_no" text,
	"instrument_date" timestamp,
	"amount" numeric(15, 2) NOT NULL,
	"deposit_bank_id" integer,
	"deposited_bank" text,
	"deposit_account_no" text,
	"courier_id" integer,
	"courier_receipt_no" text,
	"courier_charges" numeric(15, 2),
	"remarks1" text,
	"remarks2" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"fiscal_year_id" integer NOT NULL,
	"transaction_date" timestamp DEFAULT now() NOT NULL,
	"account_id" integer NOT NULL,
	"source_type" text NOT NULL,
	"source_id" integer,
	"debit" numeric(15, 2) DEFAULT '0.00',
	"credit" numeric(15, 2) DEFAULT '0.00',
	"narration" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "bids" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"bid_price_per_quintal" numeric(15, 2) NOT NULL,
	"qty_quintals" numeric(15, 3) NOT NULL,
	"token_locked" numeric(15, 2) NOT NULL,
	"status" "bid_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"sender_id" integer,
	"message_text" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chats" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" integer NOT NULL,
	"buyer_id" integer NOT NULL,
	"seller_id" integer NOT NULL,
	"agreed_buyer_price" numeric(15, 2),
	"agreed_seller_price" numeric(15, 2),
	"commission_rate" numeric(5, 4) NOT NULL,
	"status" "chat_status" DEFAULT 'NEGOTIATING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer,
	"listing_type" "listing_type" DEFAULT 'OPEN' NOT NULL,
	"direction" "listing_direction" DEFAULT 'SELL' NOT NULL,
	"commodity_id" integer NOT NULL,
	"packaging_id" integer,
	"title" text NOT NULL,
	"quality_notes" text,
	"qty_quintals" numeric(15, 3),
	"price_per_quintal" numeric(15, 2),
	"city_id" integer,
	"status" "listing_status" DEFAULT 'ACTIVE' NOT NULL,
	"close_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"password_hash" text NOT NULL,
	"role" "member_role" DEFAULT 'BOTH' NOT NULL,
	"party_id" integer,
	"token_balance" numeric(15, 2) DEFAULT '100000.00' NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"last_active" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "members_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "watchlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"listing_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_years" ADD CONSTRAINT "fiscal_years_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_company_access" ADD CONSTRAINT "user_company_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_company_access" ADD CONSTRAINT "user_company_access_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_bank_details" ADD CONSTRAINT "party_bank_details_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_contacts" ADD CONSTRAINT "party_contacts_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_delivery_addresses" ADD CONSTRAINT "party_delivery_addresses_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_roles" ADD CONSTRAINT "party_roles_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_tax_ids" ADD CONSTRAINT "party_tax_ids_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_packaging" ADD CONSTRAINT "brand_packaging_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commodities" ADD CONSTRAINT "commodities_group_id_commodity_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."commodity_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commodities" ADD CONSTRAINT "commodities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commodity_packaging" ADD CONSTRAINT "commodity_packaging_commodity_id_commodities_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "public"."commodities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commodity_specifications" ADD CONSTRAINT "commodity_specifications_commodity_id_commodities_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "public"."commodities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banks" ADD CONSTRAINT "banks_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "couriers" ADD CONSTRAINT "couriers_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_item_brokerage" ADD CONSTRAINT "party_item_brokerage_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_item_brokerage" ADD CONSTRAINT "party_item_brokerage_commodity_id_commodities_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "public"."commodities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proprietors" ADD CONSTRAINT "proprietors_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transporters" ADD CONSTRAINT "transporters_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_lines" ADD CONSTRAINT "contract_lines_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_lines" ADD CONSTRAINT "contract_lines_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_lines" ADD CONSTRAINT "contract_lines_commodity_id_commodities_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "public"."commodities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_lines" ADD CONSTRAINT "contract_lines_packaging_id_commodity_packaging_id_fk" FOREIGN KEY ("packaging_id") REFERENCES "public"."commodity_packaging"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_lines" ADD CONSTRAINT "contract_lines_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_parties" ADD CONSTRAINT "contract_parties_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_parties" ADD CONSTRAINT "contract_parties_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_specifications" ADD CONSTRAINT "contract_specifications_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_terms" ADD CONSTRAINT "contract_terms_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_fiscal_year_id_fiscal_years_id_fk" FOREIGN KEY ("fiscal_year_id") REFERENCES "public"."fiscal_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_from_city_id_cities_id_fk" FOREIGN KEY ("from_city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_to_city_id_cities_id_fk" FOREIGN KEY ("to_city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_term_id_terms_conditions_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms_conditions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_transporter_id_transporters_id_fk" FOREIGN KEY ("transporter_id") REFERENCES "public"."transporters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_fiscal_year_id_fiscal_years_id_fk" FOREIGN KEY ("fiscal_year_id") REFERENCES "public"."fiscal_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_transporter_id_parties_id_fk" FOREIGN KEY ("transporter_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_charges" ADD CONSTRAINT "delivery_charges_delivery_id_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_lines" ADD CONSTRAINT "delivery_lines_delivery_id_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_lines" ADD CONSTRAINT "delivery_lines_contract_line_id_contract_lines_id_fk" FOREIGN KEY ("contract_line_id") REFERENCES "public"."contract_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_lines" ADD CONSTRAINT "bill_lines_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_fiscal_year_id_fiscal_years_id_fk" FOREIGN KEY ("fiscal_year_id") REFERENCES "public"."fiscal_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outstanding" ADD CONSTRAINT "outstanding_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outstanding" ADD CONSTRAINT "outstanding_fiscal_year_id_fiscal_years_id_fk" FOREIGN KEY ("fiscal_year_id") REFERENCES "public"."fiscal_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outstanding" ADD CONSTRAINT "outstanding_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outstanding_details" ADD CONSTRAINT "outstanding_details_outstanding_id_outstanding_id_fk" FOREIGN KEY ("outstanding_id") REFERENCES "public"."outstanding"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outstanding_details" ADD CONSTRAINT "outstanding_details_expense_head_id_expense_heads_id_fk" FOREIGN KEY ("expense_head_id") REFERENCES "public"."expense_heads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_fiscal_year_id_fiscal_years_id_fk" FOREIGN KEY ("fiscal_year_id") REFERENCES "public"."fiscal_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_deposit_bank_id_banks_id_fk" FOREIGN KEY ("deposit_bank_id") REFERENCES "public"."banks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_courier_id_couriers_id_fk" FOREIGN KEY ("courier_id") REFERENCES "public"."couriers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger" ADD CONSTRAINT "ledger_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger" ADD CONSTRAINT "ledger_fiscal_year_id_fiscal_years_id_fk" FOREIGN KEY ("fiscal_year_id") REFERENCES "public"."fiscal_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger" ADD CONSTRAINT "ledger_account_id_parties_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger" ADD CONSTRAINT "ledger_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger" ADD CONSTRAINT "ledger_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_room_id_chats_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_members_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_buyer_id_members_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_seller_id_members_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_commodity_id_commodities_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "public"."commodities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_packaging_id_commodity_packaging_id_fk" FOREIGN KEY ("packaging_id") REFERENCES "public"."commodity_packaging"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_log_user_id" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_company_id" ON "audit_log" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_entity" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_created_at" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_companies_dept_id" ON "companies" USING btree ("department_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unq_fy_company_label" ON "fiscal_years" USING btree ("company_id","label");--> statement-breakpoint
CREATE INDEX "idx_fy_company_id" ON "fiscal_years" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unq_user_company" ON "user_company_access" USING btree ("user_id","company_id");--> statement-breakpoint
CREATE INDEX "idx_cities_name_trgm" ON "cities" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "unq_district_state" ON "districts" USING btree ("state_id","name");--> statement-breakpoint
CREATE INDEX "idx_parties_name_trgm" ON "parties" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_parties_company_id" ON "parties" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unq_party_role" ON "party_roles" USING btree ("party_id","role");--> statement-breakpoint
CREATE INDEX "idx_party_roles_party_id" ON "party_roles" USING btree ("party_id");--> statement-breakpoint
CREATE INDEX "idx_party_tax_ids_party_id" ON "party_tax_ids" USING btree ("party_id");--> statement-breakpoint
CREATE INDEX "idx_brand_pkg_brand_id" ON "brand_packaging" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "idx_commodities_name_trgm" ON "commodities" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_commodities_company_id" ON "commodities" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_banks_name" ON "banks" USING btree ("bank_name");--> statement-breakpoint
CREATE UNIQUE INDEX "unq_party_item_pkg" ON "party_item_brokerage" USING btree ("party_id","commodity_id","packing_weight");--> statement-breakpoint
CREATE INDEX "idx_prt_item_brk_party_id" ON "party_item_brokerage" USING btree ("party_id");--> statement-breakpoint
CREATE INDEX "idx_prt_item_brk_commodity_id" ON "party_item_brokerage" USING btree ("commodity_id");--> statement-breakpoint
CREATE INDEX "idx_transporters_name" ON "transporters" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_contract_docs_contract_id" ON "contract_documents" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "idx_contract_lines_contract_id" ON "contract_lines" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "idx_contract_lines_commodity_id" ON "contract_lines" USING btree ("commodity_id");--> statement-breakpoint
CREATE INDEX "idx_contract_parties_contract_id" ON "contract_parties" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "idx_contract_parties_party_id" ON "contract_parties" USING btree ("party_id");--> statement-breakpoint
CREATE INDEX "idx_contract_specs_contract_id" ON "contract_specifications" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "idx_contract_terms_contract_id" ON "contract_terms" USING btree ("contract_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unq_sauda_book_no" ON "contracts" USING btree ("company_id","fiscal_year_id","sauda_book","sauda_no");--> statement-breakpoint
CREATE INDEX "idx_contracts_company_id" ON "contracts" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_contracts_fiscal_year_id" ON "contracts" USING btree ("fiscal_year_id");--> statement-breakpoint
CREATE INDEX "idx_contracts_company_fy" ON "contracts" USING btree ("company_id","fiscal_year_id");--> statement-breakpoint
CREATE INDEX "idx_deliveries_company_id" ON "deliveries" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_deliveries_fiscal_year_id" ON "deliveries" USING btree ("fiscal_year_id");--> statement-breakpoint
CREATE INDEX "idx_deliveries_company_fy" ON "deliveries" USING btree ("company_id","fiscal_year_id");--> statement-breakpoint
CREATE INDEX "idx_delivery_lines_delivery_id" ON "delivery_lines" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX "idx_delivery_lines_contract_line_id" ON "delivery_lines" USING btree ("contract_line_id");--> statement-breakpoint
CREATE INDEX "idx_bill_lines_bill_id" ON "bill_lines" USING btree ("bill_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unq_bill_no_company_fy" ON "bills" USING btree ("company_id","fiscal_year_id","bill_no");--> statement-breakpoint
CREATE INDEX "idx_bills_company_id" ON "bills" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_bills_fiscal_year_id" ON "bills" USING btree ("fiscal_year_id");--> statement-breakpoint
CREATE INDEX "idx_bills_company_fy" ON "bills" USING btree ("company_id","fiscal_year_id");--> statement-breakpoint
CREATE INDEX "idx_outstanding_party_id" ON "outstanding" USING btree ("party_id");--> statement-breakpoint
CREATE INDEX "idx_outstanding_company_fy" ON "outstanding" USING btree ("company_id","fiscal_year_id");--> statement-breakpoint
CREATE INDEX "idx_payment_alloc_payment_id" ON "payment_allocations" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "idx_payment_alloc_bill_id" ON "payment_allocations" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX "idx_payments_company_id" ON "payments" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_payments_fiscal_year_id" ON "payments" USING btree ("fiscal_year_id");--> statement-breakpoint
CREATE INDEX "idx_payments_company_fy" ON "payments" USING btree ("company_id","fiscal_year_id");--> statement-breakpoint
CREATE INDEX "idx_ledger_account_id" ON "ledger" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_ledger_source_type" ON "ledger" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "idx_ledger_transaction_date" ON "ledger" USING btree ("transaction_date");--> statement-breakpoint
CREATE INDEX "idx_ledger_company_id" ON "ledger" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_ledger_fiscal_year_id" ON "ledger" USING btree ("fiscal_year_id");--> statement-breakpoint
CREATE INDEX "idx_ledger_company_fy" ON "ledger" USING btree ("company_id","fiscal_year_id");--> statement-breakpoint
CREATE INDEX "idx_bids_listing_id" ON "bids" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "idx_bids_member_id" ON "bids" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_chat_messages_room_id" ON "chat_messages" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "idx_chats_listing_id" ON "chats" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "idx_chats_buyer_id" ON "chats" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "idx_chats_seller_id" ON "chats" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "idx_listings_member_id" ON "listings" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_listings_commodity_id" ON "listings" USING btree ("commodity_id");--> statement-breakpoint
CREATE INDEX "idx_listings_status" ON "listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_listings_created_at" ON "listings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_members_party_id" ON "members" USING btree ("party_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unq_watchlist_member_listing" ON "watchlist" USING btree ("member_id","listing_id");--> statement-breakpoint
CREATE INDEX "idx_watchlist_member_id" ON "watchlist" USING btree ("member_id");