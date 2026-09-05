import { pgEnum } from "drizzle-orm/pg-core";

// ==========================================
// CORE SYSTEM & TRANSACTION ENUMS
// ==========================================
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'EMPLOYEE']);
export const auditActionEnum = pgEnum('audit_action', ['CREATE', 'UPDATE', 'DELETE']);

export const partyRoleEnum = pgEnum('party_role', ['BUYER', 'SELLER', 'BUYER_BROKER', 'SELLER_BROKER']);
export const taxIdTypeEnum = pgEnum('tax_id_type', ['GSTIN', 'VAT_TIN', 'CST_TIN', 'CST_NO', 'PAN']);

export const contractStatusEnum = pgEnum('contract_status', ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']);
export const deliveryStatusEnum = pgEnum('delivery_status', ['PENDING', 'DISPATCHED', 'DELIVERED', 'CANCELLED']);
export const billBasisEnum = pgEnum('bill_basis', ['CONTRACT', 'DELIVERY', 'DIRECT', 'DALALI']);
export const paymentTermTypeEnum = pgEnum('payment_term_type', ['DISCOUNT', 'CREDIT', 'PAYMENT']);

// ==========================================
// MARKETPLACE DOMAIN ENUMS
// ==========================================
export const volatilityTierEnum = pgEnum('volatility_tier', ['LOW', 'MEDIUM', 'HIGH']);
export const memberRoleEnum = pgEnum('member_role', ['BUYER', 'SELLER', 'BOTH']);
export const listingTypeEnum = pgEnum('listing_type', ['OPEN', 'TENDER']);
export const listingDirectionEnum = pgEnum('listing_direction', ['SELL', 'BUY']);
export const listingStatusEnum = pgEnum('listing_status', ['ACTIVE', 'SOLD', 'CLOSED']);
export const bidStatusEnum = pgEnum('bid_status', ['PENDING', 'ACCEPTED', 'REJECTED']);
export const chatStatusEnum = pgEnum('chat_status', ['NEGOTIATING', 'AGREED', 'CANCELLED']);
