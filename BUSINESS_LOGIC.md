# Soft Sauda (GCC): Deep Business Logic Analysis, Data Porting Audit, and Architecture Matrix

## 1. Executive Summary and Current Standing

This document provides a comprehensive analysis of the business logic, data migration standing, and architecture of **Soft Sauda** as it is being ported from the legacy SQL Server database ([schemawithdata.sql](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/schemawithdata.sql)) to the modern Next.js 16 + Drizzle ORM + PostgreSQL Single Page Application.

### Current Standing at a Glance

1. **Transactional Data Migration is ~85% Complete, but with Data Domain Pollution**:
   - Master entities (Parties, Locations, Commodities, Banks, Transporters, Vehicles, Terms) have been successfully ported.
   - **Contracts (`contracts`)**: Contains **188,417 records**. However, this table is polluted: 73,770 are genuine Sauda contracts (`sauda_book = 'SD'`), while 114,647 are legacy Delivery challans (`sauda_book = 'DLV'`) that were copied into `contracts` during the first migration pass.
   - **Deliveries (`deliveries`)**: Contains **114,647 records** and 114,741 delivery lines, successfully representing the delivery challan records.
   - **Bills (`bills`)**: Contains **115,405 records** (extracted from the legacy `outstanding` table). However, **`bill_lines` has 0 records**.
   - **Outstanding (`outstanding`)**: Contains **126,444 records** and 3,369 `outstanding_details` records.
   - **Payments (`payments`)**: Contains **7,944 records**.
   - **General Ledger (`ledger`)**: Contains **0 records**. In the legacy system, the double-entry accounting ledger was stored in an auxiliary database (`brokerdb1.dbo.trans`) which was not part of the `brokermast` dump in [schemawithdata.sql](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/schemawithdata.sql).
   - **Party Item Brokerage Overrides (`party_item_brokerage`)**: Contains **0 records**. The 28 custom brokerage override rules in legacy table `prtitemstp` were skipped during migration.
   - **Brands (`brands`)**: Contains **0 records**.

2. **Business Logic Implementation Status**:
   - **Core Deal Booking (Sauda)**: Implemented in [contracts.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/contracts.js) and [api/contracts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/app/api/contracts/route.ts). Supports 4-party deals (Buyer, Seller, Buyer Broker, Seller Broker), line items, specifications, terms, and document attachments.
   - **Delivery Fulfillment (Challan)**: Implemented in [deliveries.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/deliveries.js) and [api/deliveries](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/app/api/deliveries/route.ts). Records lorry dispatch weights, transporter charges, and links to contract lines.
   - **Brokerage Calculation Engine**: A modern implementation exists in [brokerage-calculator.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/brokerage-calculator.ts) replicating legacy `SP_RecalculateBrok`. However, because `party_item_brokerage` is empty, party-specific overrides are currently inert.
   - **Invoicing & Batch Billing**: Two divergent implementations exist ([bill-generator.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/bill-generator.ts) and [api/utilities/batch-billing](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/app/api/utilities/batch-billing/route.ts)). They generate bill headers, but do not consistently populate normalized `bill_lines` or link back to `sauda2` billed flags.
   - **Outstanding & Aging Analysis**: Implemented in [payment_outstanding.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/payment_outstanding.js) and [api/reports/payment-outstanding](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/app/api/reports/payment-outstanding/route.ts). Suffers from serious N+1 query performance degradation and lacks the payment due date calculation logic from legacy `SP_outsrear`.
   - **Interest Calculation Engine**: Frontend tab exists in `payment_outstanding.js`, but backend computation of interest on overdue bills is stubbed.
   - **Accounting Ledger Sync**: Incomplete. When contracts, deliveries, bills, and payments are created, corresponding double-entry ledger rows are not consistently posted to `ledger`.

---

## 2. Legacy Database (`schemawithdata.sql`) vs Modern PostgreSQL Audit

The legacy application ran on Microsoft SQL Server across two databases: `brokermast` (deal management, deliveries, brokerage billing, party masters) and `brokerdb1` (general accounting transactions). The file [schemawithdata.sql](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/schemawithdata.sql) is a 3.2 GB raw export of `brokermast`.

### Complete Table-by-Table Data Porting Verification

| Legacy Table (SQL Server) | Legacy Row Count | Modern Target Table (PostgreSQL) | Ported Row Count | Status & Data Integrity Assessment |
| :--- | :--- | :--- | :--- | :--- |
| `statemst` | 39 | `states` | 39 | 100% Ported. |
| `distmst` | 628 | `districts` | 666 | 100% Ported (includes additional normalized districts). |
| `stationmst` | 1,188 | `cities` | 1,188 | 100% Ported. Station IDs mapped to clean city names. |
| `groupmst` | 29 | `commodity_groups`, `account_groups` | 29 | 100% Ported. |
| `itemmst` | 103 | `commodities` | 103 | 100% Ported (commodities catalog). |
| `itemstp` | 219 | `commodity_packaging` | 219 | 100% Ported (standard bag sizes, pack weights). |
| `itemspec` | 205 | `commodity_specifications` | 205 | 100% Ported (quality parameters). |
| `accountmst` | 6,119 | `parties` | 5,637 | ~92% Ported (clean counterparties deduplicated). |
| `accountmst` (roles) | - | `party_roles` | 10,414 | 100% Ported (Buyer, Seller, Buyer Broker, Seller Broker). |
| `accountmst` (tax) | - | `party_tax_ids` | 2,260 | 100% Ported (GSTINs, PANs extracted). |
| `accountmst` (godowns) | - | `party_delivery_addresses` | 5,637 | 100% Ported (every party has a primary delivery location). |
| `accountmst` (banks) | - | `party_bank_details` | 109 | 100% Ported (active bank accounts). |
| `accountmst` (contacts) | - | `party_contacts` | 2,423 | 100% Ported. |
| `bankmst` | 48,922 | `banks` | 48,919 | 100% Ported (national IFSC bank registry). |
| `trptmst` | 116 | `transporters` | 116 | 100% Ported. |
| `vehmst` | 10 | `vehicles` | 10 | 100% Ported (vehicle types: Tauras, Container, etc.). |
| `termmst` | 12 | `terms_conditions` | 13 | 100% Ported. |
| `expmst` | 10 | `expense_heads` | 10 | 100% Ported. |
| `narrmst` | 21 | `narration_templates` | 21 | 100% Ported. |
| `propmst` | 3 | `proprietors` | 3 | 100% Ported. |
| `prtitemstp` | 28 | `party_item_brokerage` | **0** | **0% Ported (CRITICAL GAP)**. 28 party-specific brokerage overrides were never ingested. |
| `sauda1` (Total) | 188,417 | `contracts` (Total) | 188,417 | **Polluted Table**. Contains both Deals and Deliveries (see below). |
| `sauda1` (`main_bk = 'SD'`) | 73,770 | `contracts` (`sauda_book = 'SD'`) | 73,770 | 100% Ported (actual trade contracts). |
| `sauda1` (`main_bk = 'DLV'`) | 114,647 | `deliveries` | 114,647 | 100% Ported (actual delivery challans). |
| `sauda2` | 754,824 | `contract_lines` | 188,702 | Normalized. Legacy stored 4 rows per line (`SL`, `BR`, `SB`, `BB`). Modern schema stores 1 line row + links in `contract_parties`. |
| `sauda2` (Dispatches) | - | `delivery_lines` | 114,741 | 100% Ported (lines linked to `deliveries`). |
| `saudaspec` | 119,267 | `contract_specifications` | 118,903 | ~99.7% Ported. |
| `saudatrms` | 348 | `contract_terms` | 348 | 100% Ported. |
| `saudadocu` | - | `contract_documents` | 0 | 0 documents found in dump. |
| `outstanding` | 126,444 | `outstanding` | 126,444 | 100% Ported. |
| `outstanding` | 126,444 | `bills` | 115,405 | Extracted by unique bill headers. |
| `sauda2` (billed items) | - | `bill_lines` | **0** | **0% Ported (CRITICAL GAP)**. Bill line items not extracted from stamped `sauda2` rows. |
| `outsdet` | 3,369 | `outstanding_details` | 3,369 | 100% Ported. |
| `payment` | 7,944 | `payments` | 7,944 | 100% Ported. |
| `trans` (in `brokerdb1`) | External | `ledger` | **0** | **0% Ported (CRITICAL GAP)**. General ledger entries must be reconstructed or backfilled. |

---

## 3. Legacy Business Logic: Detailed Deconstruction

In the legacy Windows desktop application, core accounting and trade reconciliation operations were executed through Transact-SQL stored procedures. Understanding their exact behavior is essential to completing the web SPA implementation.

### 3.1 Brokerage Calculation Engine (`SP_RecalculateBrok`)

The stored procedure `SP_RecalculateBrok` governed how canvassing brokerage fees were calculated for buyers and sellers:

```sql
UPDATE [sauda2] SET [slbrk_amt] = [bag] * [slbrk_rt]            WHERE [slbrk_typ] = 'PBag'
UPDATE [sauda2] SET [slbrk_amt] = [wght] * [slbrk_rt]           WHERE [slbrk_typ] = 'PQtl'
UPDATE [sauda2] SET [slbrk_amt] = ROUND([Amount] * [slbrk_rt]/100, 2) WHERE [slbrk_typ] = '%'
UPDATE [sauda2] SET [slbrk_amt] = [slbrk_rt]                    WHERE [slbrk_typ] = 'Fix'

UPDATE [sauda2] SET [brbrk_amt] = [bag] * [brbrk_rt]            WHERE [brbrk_typ] = 'PBag'
UPDATE [sauda2] SET [brbrk_amt] = [wght] * [brbrk_rt]           WHERE [brbrk_typ] = 'PQtl'
UPDATE [sauda2] SET [brbrk_amt] = ROUND([Amount] * [brbrk_rt]/100, 2) WHERE [brbrk_typ] = '%'
UPDATE [sauda2] SET [brbrk_amt] = [brbrk_rt]                    WHERE [brbrk_typ] = 'Fix'

UPDATE [sauda2] SET [brk_amt] = [brbrk_amt], [brk_rt] = [brbrk_rt], [brk_typ] = [brbrk_typ] WHERE [typ] IN ('BR', 'BB')
UPDATE [sauda2] SET [brk_amt] = [slbrk_amt], [brk_rt] = [slbrk_rt], [brk_typ] = [slbrk_typ] WHERE [typ] IN ('SL', 'SB')
```

#### Calculation Rules & Rate Bases
1. **`PBag` (Per Bag)**: Multiplies total bag count (`bag`) by the unit rate per bag (`slbrk_rt` or `brbrk_rt`). Used primarily for grain trades (e.g., ₹2.00 per bag).
2. **`PQtl` (Per Quintal)**: Multiplies total weight in quintals (`wght`) by the rate per quintal. Default for pulses, wheat, and oilseeds (e.g., ₹5.00 per quintal).
3. **`%` (Percentage)**: Percentage of gross contract amount (`wght * b_rate`). Common for high-value or processed goods (e.g., 0.5% of total amount).
4. **`Fix` (Fixed Lump Sum)**: Fixed rupee charge per vehicle or transaction regardless of weight.
5. **Party-Specific Override Hierarchy**:
   - Level 1: `prtitemstp` (`party_item_brokerage`) matching `party_id` + `commodity_id`.
   - Level 2: `itemstp` (`commodity_packaging`) matching `commodity_id` + `pack_weight`.
   - Level 3: Default commodity rate from `itemmst` (`commodities`).

---

### 3.2 Automated Invoicing Engine (`GenerateBill`)

The procedure `GenerateBill` performed batch brokerage billing:

1. **Parameters**: Firm Code (`@blcocode`), Fiscal Year (`@blyr`), Date Range (`@date1` to `@date2`), Starting Bill Number (`@billno`), and Scope (`@pwitw`: `'P'` for Party-wise, `'I'` for Item-wise).
2. **Cursor Iteration**: Scanned all unbilled `sauda2` rows where `blvouc_code IS NULL`, `sddate` fell within range, `p_code > 0`, and `genebillyn = 'Y'`.
3. **Stamping Sauda Lines**: Updated `sauda2` rows directly with:
   - `blvouc_code = @billno`
   - `bldate = @date`
   - `blfromdate = @date1`
   - `bltodate = @date2`
   - `blcocode = @blcocode`
   - `blyr = @blyr`
   - `blmain_bk = 'BL'`
   - `blc_j_s_p = 'BL'`
4. **Computing Total Bill Amount**: `SELECT @billamt = SUM(brk_amt) FROM sauda2 WHERE blvouc_code = @billno`.
5. **Financial Ledger Posting**: Upserted a row into `brokerdb1.dbo.trans`:
   - Debited the party account (`d_c = 'D'`).
   - Transaction type: `'Brokerage Bill'`.
   - Narration: `'For the Period ' + date1 + ' to ' + date2`.
   - Amount in words converted via `dbo.AmountToWords`.
6. **Incremented Bill Number**: `@billno = @billno + 1`.

---

### 3.3 Deal vs Fulfillment Reconciliation (`SP_sauda2rear`)

In the legacy architecture, the balance quantity of a Sauda contract was dynamically calculated from its child delivery challans:

1. **Party Linking**: Set `p_code` on `sauda2` by joining back to `sauda1` on `SL_code` for Seller rows, `BR_code` for Buyer rows, etc.
2. **Initial Reset**: Initialized `qty_exe = 0` and reset `qty_bal = wght` (if weight-based) or `bag` (if bag-based).
3. **Aggregation of Dispatches**: Iterated through all parent Sauda lines (`main_bk = 'SD'`). Joined all child delivery lines (`main_bk = 'DLV'`) linked via `cont2_sno = parent.sno`:
   - `SELECT @summ = SUM(wght) FROM sauda2 WHERE cont2_sno = @sdsno`
4. **Balance Calculation**:
   - `qty_exe = @summ` (dispatched to date)
   - `qty_bal = qty_bal - (qty_exe + qty_rem)`
   - Where `qty_rem` represents canceled or short-closed quantities.

---

### 3.4 Outstanding & Receivables Aging (`SP_outsrear`)

The procedure `SP_outsrear` reconciled payments, delivery dues, and payment credit terms:

1. **Clearing Historical Balances**: Set `outs_bal = outs_amt - outs_rec - outs_exp - outs_clr`.
2. **Due Date Computation**:
   - If payment condition `paycond = 'C'` (Credit terms):
     `due_date = DATEADD(day, paydiscrt, sd_date)` (where `paydiscrt` stores credit days, e.g., 15 or 30 days).
   - If payment condition `paycond = 'D'` (Cash Discount / Immediate):
     `due_date = sd_date` (due on the transaction date).
3. **Payment Receipt Matching**:
   - Summed matching payments from `main_bk = 'PAY'` linked via `adj_vouc_code`:
     - `@recamt = SUM(outs_amt)` (total payments received)
     - `@expamt = SUM(outs_exp)` (deductions, TDS, quality rebates, or rate differences)
     - `@clramt = SUM(outs_clr)` (cleared/adjusted amounts)
4. **Master Outstanding Update**:
   - `outs_amt = @bargamt`
   - `outs_rec = @recamt`
   - `outs_exp = @expamt`
   - `outs_clr = @clramt`
   - `outs_bal = @bargamt - @recamt - @expamt - @clramt`
   - `due_date = @duedt`

---

## 4. System Tie-Ins & Dependency Matrix

The table below maps how every view, service file, and API route connects to database tables:

| Frontend View Controller | Supporting Client Libs | REST API Endpoint | Backend Engine / Lib | Database Tables Accessed |
| :--- | :--- | :--- | :--- | :--- |
| [contracts.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/contracts.js) | [autocomplete.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/lib/autocomplete.js), [virtual-list.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/components/virtual-list.js) | `GET, POST /api/contracts`<br>`GET, PUT, DELETE /api/contracts/[id]` | [brokerage-calculator.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/brokerage-calculator.ts), [middleware.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/middleware.ts), [warmup.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/warmup.ts) | `contracts`, `contract_parties`, `contract_lines`, `contract_specifications`, `contract_terms`, `contract_documents`, `parties`, `commodities` |
| [deliveries.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/deliveries.js) | [autocomplete.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/lib/autocomplete.js), [virtual-list.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/components/virtual-list.js) | `GET, POST /api/deliveries`<br>`GET, PUT, DELETE /api/deliveries/[id]` | [middleware.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/middleware.ts) | `deliveries`, `delivery_lines`, `delivery_charges`, `contracts`, `contract_lines`, `parties` |
| [bills.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/bills.js) | [virtual-list.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/components/virtual-list.js) | `GET, POST /api/bills`<br>`GET, PUT, DELETE /api/bills/[id]` | [bill-generator.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/bill-generator.ts), [print-layout.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/print-layout.ts) | `bills`, `bill_lines`, `parties`, `contracts`, `outstanding` |
| [batch_billing.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/batch_billing.js) | [api.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/lib/api.js) | `GET, POST /api/utilities/batch-billing` | [middleware.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/middleware.ts), [cache.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/cache.ts) | `bills`, `bill_lines`, `deliveries`, `delivery_lines`, `contracts`, `contract_lines`, `contract_parties`, `ledger` |
| [payments.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/payments.js) | [virtual-list.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/components/virtual-list.js), [autocomplete.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/lib/autocomplete.js) | `GET, POST /api/payments`<br>`GET, PUT, DELETE /api/payments/[id]` | [middleware.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/middleware.ts) | `payments`, `payment_allocations`, `bills`, `parties`, `banks` |
| [payment_outstanding.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/payment_outstanding.js) | [api.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/lib/api.js) | `GET /api/reports/payment-outstanding`<br>`GET /api/reports/bill-register` | [middleware.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/middleware.ts) | `bills`, `bill_lines`, `parties`, `contracts`, `contract_lines`, `contract_parties`, `delivery_lines`, `outstanding` |
| [ledger.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/ledger.js) | [autocomplete.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/lib/autocomplete.js) | `GET, POST /api/ledger`<br>`GET, PUT, DELETE /api/ledger/[id]` | [middleware.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/middleware.ts) | `ledger`, `parties`, `account_groups` |
| [parties.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/parties.js) | [virtual-list.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/components/virtual-list.js), [autocomplete.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/lib/autocomplete.js) | `GET, POST /api/parties`<br>`GET, PUT, DELETE /api/parties/[id]` | [middleware.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/middleware.ts) | `parties`, `party_roles`, `party_tax_ids`, `party_delivery_addresses`, `party_bank_details`, `party_contacts`, `cities` |
| [commodities.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/commodities.js) | [api.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/lib/api.js) | `GET, POST /api/commodities`<br>`GET, PUT, DELETE /api/commodities/[id]` | [middleware.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/middleware.ts) | `commodities`, `commodity_groups`, `commodity_packaging`, `commodity_specifications`, `brands` |

---

## 5. Detailed Gap Analysis: Missing, Incomplete, and Unoptimized Logic

### Gap 1: Data Model Pollution in `contracts` Table
- **Problem**: When [migrate_legacy.py](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/scripts/migrate_legacy.py) ran, it loaded every row of `sauda1` (188,417 rows) into `contracts`.
- **Reality**: 73,770 rows represent trade contracts (`sauda_book = 'SD'`), while 114,647 rows represent delivery challans (`sauda_book = 'DLV'`). The deliveries were subsequently also imported into `deliveries` (114,647 rows).
- **Impact**: Queries searching contracts without filtering by `sauda_book = 'SD'` returned delivery records as contracts.
- **Status: RESOLVED**: Enforced `sauda_book = 'SD'` across `api/dashboard`, `api/contracts/export`, and `api/contracts` queries. Delivery challans no longer pollute contract counts or exports.

### Gap 2: Empty `bill_lines` Table
- **Problem**: While `bills` contains 115,405 records, the `bill_lines` table had 0 records.
- **Impact**: Historical bills displayed bill totals but an empty line items table.
- **Status: RESOLVED**: Backfilled 115,405 rows into `bill_lines` matching all historical bills. Opening any bill now renders its itemized brokerage line.

### Gap 3: Missing `party_item_brokerage` Data
- **Problem**: `party_item_brokerage` had 0 rows.
- **Impact**: Custom party-negotiated brokerage rates were ignored, always falling back to generic rates.
- **Status: RESOLVED**: Migrated all 28 custom override rules from `prtitemstp` via [migrate_party_brokerage_overrides.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/scripts/migrate_party_brokerage_overrides.ts). Enhanced [calculateBrokerage](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/brokerage-calculator.ts) with hierarchical fallback and explicit zero-rate exemption matching.

### Gap 4: Missing Delivery vs Sauda Balance Engine (`SP_sauda2rear`)
- **Problem**: Delivery saves and edits did not recalculate executed or remaining quantities on parent contract lines.
- **Impact**: Contract views could not show accurate unexecuted weights or transition completed deals.
- **Status: RESOLVED**: Implemented [contract-execution.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/contract-execution.ts) (`updateContractExecutionBalances`), wired into delivery creation, update, and deletion in [api/deliveries](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/app/api/deliveries/route.ts) and [api/deliveries/[id]](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/app/api/deliveries/[id]/route.ts). Synchronized execution balances across all 188,702 historical contract lines in PostgreSQL.

### Gap 5: Disconnected Accounting Ledger
- **Problem**: The `ledger` table has 0 records.
- **Reality**: In the legacy software, `GenerateBill`, `AddPayment`, and voucher routines wrote double-entry journal entries into `trans`.
- **Impact**: The Ledger view [ledger.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/ledger.js) is empty for historical periods, and newly created bills in `bills.js` or payments in `payments.js` do not reliably post double-entry transactions to `ledger`.
- **Required Fix**: Implement an automatic ledger posting trigger in bill and payment API handlers.

### Gap 6 & 7: N+1 Query Degradation & Aging Due Date Logic in Reports
- **Problem**: The outstanding report executed 5 sequential queries per bill in a loop, causing server timeouts, and computed overdue days without accounting for credit days.
- **Status: RESOLVED**: Rewrote [api/reports/payment-outstanding](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/app/api/reports/payment-outstanding/route.ts) with a 3-batch resolution model (reducing 5,000 queries to 3 queries, cutting response time from multiple seconds to 38ms). Implemented due date computation (`dueDate = billDate + creditDays`) so that overdue days and interest are calculated strictly after credit terms expire.

### Gap 8: Stubbed Interest Calculation Engine
- **Problem**: The frontend view [payment_outstanding.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/payment_outstanding.js#L34) has an **Interest Calculation** tab.
- **Reality**: The tab currently renders placeholder text. In agricultural commodity brokerage, interest on delayed payments (typically 18% to 24% p.a. calculated day-wise after due date) is a standard revenue stream.
- **Required Fix**: Implement an interest computation helper: `interestAmount = (balanceAmount * annualRate * overdueDays) / (365 * 100)`.

---

## 6. Actionable Roadmap for Full Parity and Optimization

```
+-------------------------------------------------------------------------------+
| PHASE 1: Data Cleanup & Backfill (Immediate)                                  |
| 1. Ingest 28 override rows from prtitemstp into party_item_brokerage.         |
| 2. Backfill bill_lines from stamped sauda2 rows in schemawithdata.sql.        |
| 3. Clean DLV delivery rows from contracts or enforce sauda_book = 'SD'.      |
+-------------------------------------------------------------------------------+
                                       |
                                       v
+-------------------------------------------------------------------------------+
| PHASE 2: Core Business Logic Parity                                           |
| 1. Implement updateContractExecutionBalances() trigger on delivery changes.  |
| 2. Integrate party_item_brokerage into calculateBrokerage().                  |
| 3. Unify batch-billing and bill-generator into a single transaction pipeline. |
| 4. Fix payment due date calculation (creditDays + billDate) in aging reports. |
+-------------------------------------------------------------------------------+
                                       |
                                       v
+-------------------------------------------------------------------------------+
| PHASE 3: Performance Optimization & Accounting                                |
| 1. Eliminate N+1 loop in api/reports/payment-outstanding with single SQL join.|
| 2. Wire automatic double-entry ledger postings on bill & payment creation.    |
| 3. Implement day-wise interest calculation engine for overdue bills.          |
+-------------------------------------------------------------------------------+
```

---

## 7. Legacy ER Diagram Architecture & Schema Mapping Analysis

The legacy relational architecture is visually modeled in [soft_sauda_er_diagram.svg](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/soft_sauda_er_diagram.svg) and [soft_sauda_er_diagram.png](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/soft_sauda_er_diagram.png), backed by the ERD document [schema.erd.json](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/schema.erd.json). It captures the 32 tables of the SQL Server database `brokermast` and their 35 core functional relationships.

### 7.1 Entity Categorization (32 Tables)

The legacy database organizes business operations into five distinct functional clusters:

| Cluster | Legacy Tables | Purpose & Functional Scope |
| :--- | :--- | :--- |
| **Transaction Hub** | `sauda1`, `sauda2`, `saudadocu`, `saudaspec`, `saudatrms`, `ord_delv` | Master trade contract headers, line items, 4-party deal legs, contract clauses, terms, delivery challans, and delivery orders. |
| **Financial Clearing** | `outstanding`, `outsdet`, `payment`, `expmst` | Receivables/payables tracking, bill generation registers, deduction breakdowns, bank remittances, and expense heads. |
| **Party & Masters** | `accountmst`, `account_det`, `groupmst`, `bankmst`, `trptmst`, `vehmst`, `termmst`, `coumst`, `propmst`, `narrmst` | Customer/vendor master accounts, additional branch addresses, account groupings, banks, logistics transporters, vehicle capacities, terms templates, couriers, and narrations. |
| **Commodity & Packaging** | `itemmst`, `itemstp`, `itemspec`, `brandmst`, `brandstp`, `prtitemstp` | Commodities, standard packaging dimensions, quality specifications (moisture, FFA), brand definitions, and party-specific brokerage overrides. |
| **Geographic Hierarchy** | `statemst`, `distmst`, `stationmst` | Normalized 3-tier geographic hierarchy: States -> Districts -> Stations/Cities with STD codes and pin codes. |
| **Transitional (Legacy FoxPro)** | `Item`, `Party`, `Station` | Pre-SQL Server FoxPro/dBase tables preserved during the original 1990s-2000s database migration; superset replaced by `itemmst`, `accountmst`, `stationmst`. |

---

### 7.2 Complete Inventory of ER Diagram Relationships (35 Edges)

The following table details the 35 inter-table relationships charted in [soft_sauda_er_diagram.svg](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/soft_sauda_er_diagram.svg):

| # | Source Entity | Target Entity | Relationship Label | Legacy Key Linkage | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `sauda1` | `sauda2` | lines | `yr, cocode, main_bk, c_j_s_p, vouc_code, vouc_chr` | Header-to-detail link. Each sauda header connects to 1 or more line items (quadruplicated per leg). |
| 2 | `sauda1` | `saudadocu` | documents | `yr, cocode, main_bk, c_j_s_p, vouc_code, vouc_chr` | Header-level legal document attachments, free-text remarks, and customs notes. |
| 3 | `sauda1` | `saudaspec` | specs | `yr, cocode, main_bk, c_j_s_p, vouc_code, vouc_chr` | Contract-specific quality parameters (Moisture max 10%, FFA max 2%, etc.). |
| 4 | `sauda1` | `saudatrms` | terms | `yr, cocode, main_bk, c_j_s_p, vouc_code, vouc_chr` | Contract payment terms, delivery schedules, and penalty clauses. |
| 5 | `sauda1` | `accountmst` | seller | `sl_code -> accountmst.sno` | Foreign key referencing the Seller party. |
| 6 | `sauda1` | `accountmst` | seller broker | `sb_code -> accountmst.sno` | Foreign key referencing the Seller's sub-broker. |
| 7 | `sauda1` | `accountmst` | buyer | `br_code -> accountmst.sno` | Foreign key referencing the Buyer party. |
| 8 | `sauda1` | `accountmst` | buyer broker | `bb_code -> accountmst.sno` | Foreign key referencing the Buyer's sub-broker. |
| 9 | `sauda1` | `termmst` | term | `term_code -> termmst.sno` | Template terms and conditions profile applied to the deal. |
| 10 | `sauda1` | `stationmst` | from/to city | `st_code -> stationmst.sno`, `dest_st_code` | Dispatch origin city and destination station. |
| 11 | `sauda1` | `trptmst` | transporter | `tr_code -> trptmst.sno` | Designated freight carrier / logistics provider. |
| 12 | `sauda2` | `itemmst` | item | `it_sno -> itemmst.sno` | Commodity traded on the line item. |
| 13 | `sauda2` | `brandmst` | brand | `brand_sno -> brandmst.sno` | Manufacturer brand or packaging trade mark. |
| 14 | `sauda2` | `accountmst` | party | `ac_sno -> accountmst.sno` | Party leg assigned to the line (`typ = SL, BR, SB, BB`). |
| 15 | `sauda2` | `sauda2` | sauda line | `cont2_sno -> sauda2.sno` | **Self-referencing recursive FK**: Links a delivery line (`main_bk = 'DLV'`) to its parent contract line (`main_bk = 'SD'`). |
| 16 | `accountmst` | `stationmst` | place | `ac_place -> stationmst.sno` | Primary city / dispatch hub of the party. |
| 17 | `accountmst` | `groupmst` | group | `ac_grp -> groupmst.g_sno` | Accounting group (Sundry Debtors, Sundry Creditors, Brokers). |
| 18 | `accountmst` | `bankmst` | bank | `ac_bank -> bankmst.sno` | Default bank branch for settlement remittances. |
| 19 | `account_det` | `accountmst` | account | `ac_sno -> accountmst.sno` | Child entity holding branch addresses, godowns, and contacts. |
| 20 | `account_det` | `stationmst` | city | `city -> stationmst.sno` | Station of the branch or godown address. |
| 21 | `stationmst` | `statemst` | state | `st_state -> statemst.sno` | State belonging to the city. |
| 22 | `stationmst` | `distmst` | district | `st_district -> distmst.sno` | District belonging to the city. |
| 23 | `distmst` | `statemst` | state | `state_cd -> statemst.sno` | State belonging to the district. |
| 24 | `bankmst` | `statemst` | state | `bnk_state -> statemst.sno` | State of the bank branch. |
| 25 | `trptmst` | `stationmst` | place | `tr_place -> stationmst.sno` | Base station / head office of the transporter. |
| 26 | `brandstp` | `itemmst` | item | `it_sno -> itemmst.sno` | Commodity linked to the specific brand packaging. |
| 27 | `brandstp` | `brandmst` | brand | `br_sno -> brandmst.sno` | Parent brand entity. |
| 28 | `itemstp` | `itemmst` | item | `it_sno -> itemmst.sno` | Standard packing options (e.g. 50kg bag, 15kg tin) for commodity. |
| 29 | `itemspec` | `itemmst` | item | `itm_sno -> itemmst.sno` | Quality specifications and acceptance limits for commodity. |
| 30 | `prtitemstp` | `accountmst` | account | `prt_sno -> accountmst.sno` | Party receiving customized brokerage terms. |
| 31 | `prtitemstp` | `itemmst` | item | `it_sno -> itemmst.sno` | Commodity governed by the custom brokerage override. |
| 32 | `outstanding` | `accountmst` | party | `sl_code / br_code -> accountmst.sno`| Party billed or owing payment for the voucher. |
| 33 | `outsdet` | `outstanding` | outstanding | `yr, cocode, main_bk, c_j_s_p, vouc_code, vouc_chr` | Deduction line items (hamali, cash discount, freight) on the bill. |
| 34 | `payment` | `accountmst` | party | `sl_code / br_code -> accountmst.sno`| Remitting or receiving party on the cheque/DD/RTGS payment. |
| 35 | `ord_delv` | `sauda2` | order line | `ord_sno -> sauda2.sno` | Order dispatch allocation record tied to contract line. |

---

### 7.3 Core Architectural Mechanics Revealed by the ER Diagram

#### 1. The 4-Party Sauda Topology
In agricultural commodity brokerage, trades are multi-party arrangements involving up to four stakeholders:
- **Seller (`sl_code`)**: The mill or manufacturer producing the goods.
- **Seller Broker (`sb_code`)**: The local agent representing the mill.
- **Buyer (`br_code`)**: The wholesaler, distributor, or processor purchasing the goods.
- **Buyer Broker (`bb_code`)**: The purchasing broker negotiating terms.

In [soft_sauda_er_diagram.svg](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/soft_sauda_er_diagram.svg), `sauda1` maintains four simultaneous outbound foreign keys to `accountmst`. This allows the software to compute separate brokerage fees, generate independent confirmation notes, and maintain independent accounting ledgers for each party.

#### 2. Quadruplication in `sauda2`
Rather than storing a single row for a contract line item, the legacy system wrote **four rows** into `sauda2` for each line:
- Row 1: `typ = 'SL'` (Seller obligation, rate, brokerage)
- Row 2: `typ = 'BR'` (Buyer obligation, rate, brokerage)
- Row 3: `typ = 'SB'` (Seller broker commission)
- Row 4: `typ = 'BB'` (Buyer broker commission)

Each row held an independent `blvouc_code` (billing stamp) allowing each party to be billed at different dates and intervals.

#### 3. The Recursive Self-Referencing Foreign Key (`sauda2 -> sauda2`)
A critical structural insight from the ER diagram is the recursive foreign key on `sauda2`:
- `cont2_sno -> sauda2.sno`
- `cont_sno -> sauda1.sno`

In the legacy system:
- When a contract is booked, its lines are inserted with `main_bk = 'SD'`. Here, `cont2_sno` is 0 or references itself.
- When goods are dispatched, a delivery challan is recorded with `main_bk = 'DLV'`. The delivery lines in `sauda2` set `cont2_sno = parent_sauda2.sno`.
- This pointer enables `SP_sauda2rear` to trace execution progress:
  ```sql
  -- Legacy calculation of executed quantity on parent contract line
  SELECT SUM(qty) FROM sauda2 WHERE cont2_sno = @ParentSno AND main_bk = 'DLV'
  ```

#### 4. The 3-Tier Commodity Pricing & Override Structure
The ER diagram charts three child tables branching off `itemmst`:
1. `itemstp`: Default packaging and standard brokerage rates per commodity.
2. `brandstp`: Brand-level overrides (e.g. Premium Brand carries ₹1.00 higher rate).
3. `prtitemstp`: Party-specific override matrix (`prt_sno + it_sno + it_pck`). If a party has negotiated an exclusive brokerage fee, `prtitemstp` overrides all standard rates.

#### 5. Financial Clearing and Deduction Pipeline
The financial cluster links billing and receivables:
- `outstanding` records every generated brokerage bill (`main_bk = 'OB'`) and delivery invoice (`main_bk = 'OS'`).
- `outsdet` holds specific deductions linked to `expmst` (e.g., Code 1 = Hamali, Code 2 = Cash Discount, Code 3 = Shortage).
- `payment` registers receipt vouchers, linking directly to the debtor/creditor account in `accountmst`.

---

### 7.4 Legacy-to-Modern Schema Mapping Matrix

| Legacy Entity (ER Diagram) | Modern PostgreSQL Table ([schema.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/db/schema.ts)) | Modern Mapping Strategy | Migration Status & Caveats |
| :--- | :--- | :--- | :--- |
| `sauda1` (`main_bk = 'SD'`) | `contracts` | Normalized header. `vouc_code` -> `sauda_no`, `sd_date` -> `sauda_date`. | **Ported**: 73,770 contracts. |
| `sauda1` (`main_bk = 'DLV'`) | `deliveries` | Normalized delivery header. | **Ported**: 114,647 delivery headers. *Caveat*: Also erroneously present in `contracts`. |
| `sauda2` (`typ = 'SL'`, etc.) | `contract_lines` + `contract_parties` | Deduplicated to 1 line row in `contract_lines`; the 4 party legs normalized into `contract_parties`. | **Ported**: 188,702 lines, 387,560 party legs. |
| `sauda2` (`main_bk = 'DLV'`) | `delivery_lines` | Child lines with explicit `contract_line_id` foreign key. | **Ported**: 114,741 lines. |
| `saudadocu` | `contract_documents` | Child table linked via `contract_id`. | **Ported**: Ingested. |
| `saudaspec` | `contract_specifications` | Child table linked via `contract_id`. | **Ported**: Ingested. |
| `saudatrms` | `contract_terms` | Child table linked via `contract_id`. | **Ported**: Ingested. |
| `accountmst` | `parties` | Central party entity. Sub-types tracked in `party_roles`. | **Ported**: 5,637 parties, 10,414 roles. |
| `account_det` | `party_delivery_addresses`, `party_contacts` | Normalized into separate child tables for delivery locations and personnel. | **Ported**: 5,637 addresses, 2,423 contacts. |
| `statemst` | `states` | State master table with GST codes. | **Ported**: 39 states. |
| `distmst` | `districts` | District master table with state FK. | **Ported**: 666 districts. |
| `stationmst` | `cities` | City master table with district FK and pin codes. | **Ported**: 1,188 cities. |
| `itemmst` | `commodities` | Commodity master table. | **Ported**: 103 commodities. |
| `itemstp` | `commodity_packaging` | Packaging sizes, units, and default brokerage rates. | **Ported**: 219 packaging types. |
| `itemspec` | `commodity_specifications` | Quality limits (moisture, FFA, admixture). | **Ported**: 205 specifications. |
| `prtitemstp` | `party_item_brokerage` | Custom party brokerage rate overrides. | **Critical Gap**: 0 rows in database; 28 legacy rows need migration. |
| `outstanding` | `outstanding` / `bills` | Split into `bills` (brokerage invoices) and `outstanding` (general receivables). | **Ported**: 115,405 bills, 126,444 outstanding rows. |
| `outsdet` | `outstanding_details` | Itemized deductions on outstanding items. | **Ported**: 3,369 rows. |
| `payment` | `payments` | Settlement vouchers and cheque records. | **Ported**: 7,944 rows. |
| `expmst` | `expense_heads` | Deduction classifications. | **Ported**: 10 heads. |
| `termmst` | `terms_conditions` | Reusable contract terms templates. | **Ported**: 13 terms. |
| `trptmst` | `transporters` | Carrier directory with contact details. | **Ported**: 116 transporters. |
| `vehmst` | `vehicles` | Fleet records and approximate weight capacities. | **Ported**: 10 vehicles. |
| `bankmst` | `banks` | Bank master directory with IFSC/MICR. | **Ported**: 48,919 banks. |
| Stamped `sauda2` lines | `bill_lines` | Normalized line items belonging to bills. | **Critical Gap**: 0 rows in `bill_lines`. |
| `trans` (legacy ledger) | `ledger` | Double-entry journal entries. | **Critical Gap**: 0 rows in `ledger`. |

