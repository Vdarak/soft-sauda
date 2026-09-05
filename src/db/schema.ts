// ==========================================================================
// DRIZZLE SCHEMA ROOT
// Re-exports all modular domain schemas from ./schema/index.ts
//
// Domain modules:
// - schema/enums.ts              : System & domain enums
// - schema/00-auth-companies.ts  : Companies, Fiscal Years, Users, Audit Log
// - schema/01-locations.ts       : States, Districts, Cities
// - schema/02-parties.ts         : Parties, Tax IDs, Addresses, Bank Details, Contacts
// - schema/03-commodities.ts     : Commodities, Packaging, Specifications, Brands
// - schema/04-masters.ts         : Banks, Transporters, Vehicles, Terms, Expense Heads
// - schema/05-contracts.ts       : Contracts (Sauda), Contract Parties, Contract Lines
// - schema/06-deliveries.ts      : Deliveries, Delivery Lines, Delivery Charges
// - schema/07-billing.ts         : Bills, Bill Lines, Payments, Allocations, Outstanding
// - schema/08-ledger.ts          : Financial Ledger
// - schema/09-marketplace.ts     : Marketplace Members, Listings, Bids, Chats
// ==========================================================================

export * from "./schema/index";
