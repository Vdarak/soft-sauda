# Soft Sauda (GCC) Codebase Architecture and File Inventory

## 1. System Overview

**Soft Sauda** (operated under Ganesh Canvassing Company / GCC) is an enterprise commodity trading, brokerage, and ERP management platform built specifically for Indian agricultural commodity brokers, canvassing agents, and trading houses.

The platform coordinates the entire lifecycle of agricultural commodity trades:
1. **Counterparty (Party) Management**: Buyers, sellers, buyer brokers, seller brokers, GSTINs, delivery addresses, bank details, and contact directories.
2. **Sauda (Contract) Recording**: High-speed multi-line commodity deal booking with custom brokerage rules, packing specifications, delivery terms, and payment conditions.
3. **Dispatch & Delivery Tracking**: Delivery challans, weighbridge records, lorry allocation, transporter management, and delivery charges.
4. **Billing & Invoicing**: Automated batch and single bill generation, brokerage fee calculation, GST compliance, and invoice printing.
5. **Accounting & Ledgers**: Payment vouchers, bill-to-payment allocations, financial ledgers, and overdue receivables/payables aging.
6. **Multi-Tenancy & Governance**: Multi-company support, fiscal year isolation (with locking), and strict Role-Based Access Control (RBAC).
7. **B2B Commodity Marketplace**: A public-facing trading portal where external members can discover listings, place bids, participate in tenders, and negotiate in real time.

---

## 2. High-Level Architectural Model

The repository uses a unified full-stack architecture combining a Next.js 16 backend with a three-surface frontend:

```
                                      +--------------------------------------------+
                                      |             Next.js 16 Runtime             |
                                      +--------------------------------------------+
                                             |                              |
                          +------------------+------------------+           |
                          | Catch-All HTML Shell Routers       |           |
                          +-------------------------------------+           |
                          |                                     |           |
    GET / & /about        | GET /dashboard, /parties, etc.      | GET /market/* |
           |              |                                     |           |
           v              v                                     v           |
   +---------------+ +-----------------------+       +--------------------+ |
   | LANDING_SHELL | |       ERP_SHELL       |       |    MARKET_SHELL    | |
   | Public Site   | | Staff Enterprise ERP  |       | B2B Marketplace    | |
   | (Vanilla JS)  | | (Oat.ink + SPA Views) |       | (Vanilla SPA)      | |
   +---------------+ +-----------------------+       +--------------------+ |
                                                                            |
                                +-------------------------------------------+
                                |
                                v
                +---------------------------------+
                | REST API Routes (/api/*)        |
                | - Multi-Company Tenancy Headers |
                | - RBAC & Audit Trail Engine     |
                | - In-Memory Cache & Warmup      |
                +---------------------------------+
                                |
                                v
                +---------------------------------+
                | Drizzle ORM + Postgres.js       |
                +---------------------------------+
                                |
                                v
                +---------------------------------+
                | PostgreSQL 16 Database          |
                +---------------------------------+
```

### The Three Independent Surfaces

The frontend does not bundle React for rendering. Instead, Next.js route handlers serve pre-composed HTML shells defined in [shells.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/shells.ts). Each surface operates with isolated client-side routing, state, and authentication:

1. **Staff ERP ([ERP_SHELL](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/shells.ts#L21))**:
   - Served on `/dashboard`, `/parties`, `/contracts`, `/bills`, `/deliveries`, `/ledger`, `/admin`, etc.
   - Powered by [app.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/app.js), Oat.ink CSS, and 20 modular view controllers.
   - Authentication via staff JWT (`ss_token`) passed with `x-company-id` and `x-fiscal-year-id` headers.
   - Pre-warmed via [warmup.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/warmup.ts) for instant navigation without loading delays.

2. **Public Landing Site ([LANDING_SHELL](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/shells.ts#L113))**:
   - Served on `/`, `/about`, `/contact`.
   - Editorial showcase describing GCC services, market presence, and corporate background.
   - Driven by [site.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/site/site.js) and [site.css](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/site/site.css).

3. **B2B Commodity Marketplace ([MARKET_SHELL](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/shells.ts#L239))**:
   - Served on `/market` and all `/market/*` paths.
   - Independent trading portal with member signup, feed, listings, bid submission, and live negotiation chat.
   - Driven by [app.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/market/app.js), [market.css](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/market/market.css), and member token authentication (`mkt_token`).

---

## 3. Top-Level Folder Structure

| Folder | Primary Purpose |
| :--- | :--- |
| [.github/](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/.github) | GitHub Actions CI/CD workflows for automated remote deployment. |
| [drizzle/](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/drizzle) | Database migration files and metadata generated by Drizzle Kit. |
| [public/](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public) | Static client-side assets, scripts, styles, vendor libraries, and logos. |
| [scripts/](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/scripts) | Developer server proxy, data migration pipelines, enrichment, and scaffolding utilities. |
| [scratch/](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/scratch) | Internal diagnostic, schema inspection, and test scripts. |
| [src/](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src) | Main application source code containing the Next.js API router, Drizzle ORM models, and business logic. |

---

## 4. Root Files Inventory

| File | Purpose |
| :--- | :--- |
| [AGENTS.md](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/AGENTS.md) | Project design rules: mandates a strict zero-emoji policy across all UI elements and code, requiring standard inline SVG icons. |
| [bun.lock](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/bun.lock) | Binary lockfile generated when using the Bun package manager. |
| [Dockerfile](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/Dockerfile) | Multi-stage production container build (deps -> builder -> runner) generating a minimal Next.js standalone container on Node 20 Alpine. |
| [docker-compose.yml](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/docker-compose.yml) | Docker Compose specification orchestrating PostgreSQL 16 Alpine and the web application container on port 80. |
| [drizzle.config.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/drizzle.config.ts) | Configuration for Drizzle Kit; maps schema path `./src/db/schema.ts` to output folder `./drizzle` for PostgreSQL. |
| [drop_tables.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/drop_tables.ts) | Maintenance script to cascade-drop transactional and core ERP tables when resetting schemas. |
| [eslint.config.mjs](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/eslint.config.mjs) | ESLint configuration utilizing Next.js recommended rules. |
| [fix_dates.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/fix_dates.ts) | Database utility executing `ALTER TABLE ... USING` to cast legacy text date columns into true PostgreSQL timestamps. |
| [masterschema.sql](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/masterschema.sql) | Raw SQL Server legacy table definitions and schema export. |
| [masterschema_utf8.sql](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/masterschema_utf8.sql) | UTF-8 sanitized legacy schema export. |
| [next.config.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/next.config.ts) | Next.js configuration enabling `output: 'standalone'` for streamlined Docker builds. |
| [next-env.d.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/next-env.d.ts) | Auto-generated TypeScript declarations for Next.js build integration. |
| [package.json](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/package.json) | NPM configuration declaring scripts (`dev`, `backend`, `build`, `start`, `lint`) and dependencies (Drizzle ORM, Postgres.js, Jose, Oat, Lucide). |
| [package-lock.json](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/package-lock.json) | Deterministic lockfile for installed NPM packages. |
| [schema.erd.json](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/schema.erd.json) | Machine-readable JSON representation of all entities and foreign key relations. |
| [schemawithdata.sql](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/schemawithdata.sql) | Comprehensive ~3.2 GB database snapshot containing production historical trading data. |
| [scratch.mjs](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/scratch.mjs) | Migration helper script activating the `pg_trgm` PostgreSQL extension for fuzzy search. |
| [soft_sauda_er_diagram.png](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/soft_sauda_er_diagram.png) | Visual PNG export of the legacy Entity-Relationship diagram. Analyzed in detail in [BUSINESS_LOGIC.md#7](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/BUSINESS_LOGIC.md#7-legacy-er-diagram-architecture--schema-mapping-analysis). |
| [soft_sauda_er_diagram.svg](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/soft_sauda_er_diagram.svg) | Scalable vector graphic export of the legacy Entity-Relationship diagram (32 tables, 35 relationships). Detailed analysis in [BUSINESS_LOGIC.md#7](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/BUSINESS_LOGIC.md#7-legacy-er-diagram-architecture--schema-mapping-analysis). |
| [softsauda.db](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/softsauda.db) | Local SQLite database file utilized during initial prototyping. |
| [sqlite.db](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/sqlite.db) | Secondary local SQLite database artifact. |
| [test-search.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/test-search.js) | Test harness for verifying database search queries. |
| [tsconfig.json](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/tsconfig.json) | TypeScript configuration specifying path aliases (`@/*` -> `./src/*`) and compiler target settings. |
| [tsconfig.tsbuildinfo](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/tsconfig.tsbuildinfo) | Incremental compiler cache for accelerated TypeScript type-checking. |

---

## 5. Source Code Directory ([src/](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src))

### 5.1 Database Models ([src/db/](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/db))

- [index.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/db/index.ts): Initialises the `postgres` driver client with connection pooling (15 connections, 15s idle timeout) and instantiates the `drizzle(client, { schema })` ORM wrapper.
- [schema.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/db/schema.ts): Root schema entry point re-exporting all modular domain schemas from `./schema/index.ts`.
- [seed-companies.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/db/seed-companies.ts): Complete database seeder creating 4 operational companies (Pulses, Soybean & Wheat, Oil & Cake, MAFI), fiscal years, administrative accounts, realistic masters, trade contracts, and marketplace listings.
- [seed-experimental.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/db/seed-experimental.ts): Minimal clean-slate seeder that generates core companies and users without mocking transactional trade data.

#### Modular Schema Definitions ([src/db/schema/](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/db/schema))

- [enums.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/db/schema/enums.ts): Defines PostgreSQL enum types for user roles (`ADMIN`, `EMPLOYEE`), audit actions (`CREATE`, `UPDATE`, `DELETE`), party roles (`BUYER`, `SELLER`, `BUYER_BROKER`, `SELLER_BROKER`), tax identifier types (`GSTIN`, `PAN`, `VAT_TIN`), contract statuses (`DRAFT`, `ACTIVE`, `COMPLETED`, `CANCELLED`), delivery statuses, bill bases, and marketplace enums (`OPEN`, `TENDER`, `SELL`, `BUY`, `PENDING`, `ACCEPTED`, `REJECTED`).
- [00-auth-companies.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/db/schema/00-auth-companies.ts): Tables for `departments`, `companies` (multi-tenant containers), `fiscal_years` (accounting periods with `is_locked`), `users` (credentials and JSON permissions), `user_company_access` (tenancy mapping), and `audit_log` (action auditing).
- [01-locations.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/db/schema/01-locations.ts): Geographic hierarchy tables: `states`, `districts`, and `cities` (with state/district foreign keys).
- [02-parties.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/db/schema/02-parties.ts): Counterparty relational model:
  - `parties`: Base business partner record (name, print name, group, city, credit limits, phone, email, TDS flags).
  - `party_roles`: Specific roles assigned to the party (buyer, seller, broker).
  - `party_tax_ids`: GSTIN, PAN, VAT, and CST identifiers.
  - `party_delivery_addresses`: Destination delivery stations and warehouses.
  - `party_bank_details`: Bank names, account numbers, and IFSC codes.
  - `party_contacts`: Key contact persons, designations, and phone numbers.
- [03-commodities.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/db/schema/03-commodities.ts): Commodity catalogues:
  - `commodity_groups`: Group classification (Pulses, Oilseeds, Grains).
  - `commodities`: Base commodity records (name, HSN code, tax rates, standard weight).
  - `commodity_packaging`: Bag types, default pack weights, and standard packaging rules.
  - `commodity_specifications`: Quality parameters (moisture, foreign matter, oil content).
  - `brands` & `brand_packaging`: Brand names linked to commodities.
- [04-masters.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/db/schema/04-masters.ts): Auxiliary ERP master entities:
  - `banks`: Company and transaction banking accounts.
  - `expense_heads`: Chart of expense categories.
  - `account_groups`: General ledger grouping hierarchies.
  - `narration_templates`: Standard transaction descriptions.
  - `terms_conditions`: Boilerplate contract clauses.
  - `transporters`: Freight carrier registry.
  - `vehicles`: Truck and transport vehicle registry.
  - `couriers`: Document dispatch carriers.
  - `proprietors`: Business entity ownership signatures.
  - `party_item_brokerage`: Party-specific custom brokerage rate overrides.
- [05-contracts.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/db/schema/05-contracts.ts): Core deal booking architecture:
  - `contracts`: Primary Sauda deal header (sauda number, date, company, fiscal year, delivery conditions, payment terms, status).
  - `contract_parties`: Many-to-many counterparty links (buyer, seller, buyer broker, seller broker).
  - `contract_lines`: Multi-item deal lines (commodity, packaging, weight, rate, bags, lorries, linked bill ID).
  - `contract_documents`: Attached scanned contracts or weighment slips.
  - `contract_specifications`: Agreed trade specifications for the contract.
  - `contract_terms`: Specific terms applied to the deal.
- [06-deliveries.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/db/schema/06-deliveries.ts): Fulfillment architecture:
  - `deliveries`: Dispatch challan records (challan number, dispatch date, transporter, vehicle number).
  - `delivery_lines`: Line items specifying dispatched weight and bags, linked to `contract_lines`.
  - `delivery_charges`: Freight, loading, and detention expenses.
- [07-billing.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/db/schema/07-billing.ts): Financial settlement models:
  - `bills`: Invoices generated for brokerage and commodity charges.
  - `bill_lines`: Line items breaking down brokerage, cess, and taxes.
  - `payments`: Inward and outward payment vouchers.
  - `payment_allocations`: Mapping payments directly to specific bills.
  - `outstanding` & `outstanding_details`: Real-time receivables and payables aging balances.
- [08-ledger.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/db/schema/08-ledger.ts): General financial ledger storing double-entry debit/credit transactions.
- [09-marketplace.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/db/schema/09-marketplace.ts): B2B Commodity Marketplace models:
  - `members`: External buyer/seller user profiles, credentials, and verification status.
  - `listings`: Active buy/sell listings (commodity, quantity, base price, expiry, type).
  - `watchlist`: Saved listings bookmarked by members.
  - `bids`: Quotes and proposals submitted against open listings or tenders.
  - `chats`: Real-time negotiation chat threads tied to listings.
  - `chat_messages`: Individual negotiation messages and counter-offers.
- [index.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/db/schema/index.ts): Barrel export aggregating all schema definitions into a single object.

---

### 5.2 Business Logic & Engines ([src/lib/](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib))

- [api-helpers.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/api-helpers.ts): Standardized HTTP JSON response factories (`ok`, `created`, `badRequest`, `unauthorized`, `forbidden`, `notFound`, `serverError`), JWT token generation and verification using `jose`, and salted SHA-256 password hashing.
- [bill-generator.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/bill-generator.ts): Invoicing engine replicating the legacy SQL Server `GenerateBill` stored procedure. Collects unbilled contract lines, generates invoice records scoped to company and fiscal year, updates deal links, and computes payment due dates.
- [brokerage-calculator.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/brokerage-calculator.ts): Dynamic brokerage engine replicating `SP_RecalculateBrok`. Evaluates custom party overrides (`party_item_brokerage`), standard commodity packaging defaults, and applies rate algorithms (per quintal, per bag, or percentage).
- [cache.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/cache.ts): High-speed in-memory TTL caching engine with prefix-based invalidation (`cacheInvalidate`) and performance metrics tracking.
- [date-utils.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/date-utils.ts): Indian business date formatting utilities producing standard `DD/MM/YYYY` representations.
- [market-auth.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/market-auth.ts): Authentication routines dedicated to public marketplace members, handling separate token verification and member context extraction.
- [middleware.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/middleware.ts): Core enterprise request interceptor:
  - Validates staff JWTs.
  - Extracts tenancy context via `x-company-id` and `x-fiscal-year-id` headers.
  - Verifies user permissions against granular resource matrices.
  - Sanitizes sensitive audit timestamps for non-administrators.
  - Records asynchronous audit trail entries to `audit_log`.
- [permissions.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/permissions.ts): Role-Based Access Control matrix defining permissions across roles (`OWNER`, `ADMIN`, `EMPLOYEE`, `AUDITOR`) for all system resources.
- [print-layout.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/print-layout.ts): HTML document layout renderer producing clean, print-ready documents (contract confirmations, bills, delivery notes) with corporate headers, GSTIN credentials, and signoff blocks.
- [shells.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/shells.ts): Houses the HTML templates for the three independent application surfaces (`ERP_SHELL`, `LANDING_SHELL`, `MARKET_SHELL`).
- [warmup.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/lib/warmup.ts): Enterprise performance pre-loader that runs parallel queries on login to preload all company and fiscal year data into memory and prime the client SPA cache.

---

### 5.3 Next.js Application Routes ([src/app/](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/app))

- [icon.svg](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/app/icon.svg): Vector application icon.
- [[[...slug]]/route.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/app/%5B%5B...slug%5D%5D/route.ts): Root catch-all route handler. Serves `LANDING_SHELL` for `/`, `/about`, and `/contact`, and serves `ERP_SHELL` for all staff ERP paths.
- [market/[[...slug]]/route.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/app/market/%5B%5B...slug%5D%5D/route.ts): Catch-all route handler serving `MARKET_SHELL` for all marketplace paths under `/market/*`.

#### REST API Endpoints ([src/app/api/](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/src/app/api))

| Route | Method(s) | Description |
| :--- | :--- | :--- |
| `account-groups/` | GET, POST | List and create chart of accounts groups. |
| `account-groups/[id]/` | GET, PUT, DELETE | Retrieve, update, or remove specific account groups. |
| `analytics/` | GET | Aggregated turnover, volumes, commodity trends, and broker metrics. |
| `audit-logs/` | GET | Query system audit trails with user and timestamp filters. |
| `auth/login/` | POST | Authenticate staff users and return signed JWT with company permissions. |
| `auth/me/` | GET | Retrieve authenticated user profile and permissions. |
| `banks/` | GET, POST | Bank master management. |
| `banks/[id]/` | GET, PUT, DELETE | Update or delete banking masters. |
| `bills/` | GET, POST | List invoices and manually create new billing records. |
| `bills/[id]/` | GET, PUT, DELETE | Manage individual bills and invoice lines. |
| `bills/export/` | GET | CSV/Excel export of bill register. |
| `brands/` | GET, POST | Manage brand catalog. |
| `cities/` | GET, POST | Query cities, districts, and states with fuzzy search. |
| `cities/[id]/` | GET, PUT, DELETE | Update or delete city master records. |
| `commodities/` | GET, POST | Manage tradeable commodities and standard specifications. |
| `commodities/[id]/` | GET, PUT, DELETE | Modify commodity details and packaging definitions. |
| `companies/` | GET, POST | Multi-company configuration and creation. |
| `contracts/` | GET, POST | List deals and create multi-line Sauda contracts. |
| `contracts/[id]/` | GET, PUT, DELETE | Retrieve or update contract headers, parties, and deal lines. |
| `contracts/[id]/documents/` | GET, POST | Upload and retrieve scanned contract documents. |
| `contracts/[id]/specifications/` | GET, POST | Manage agreed quality parameters for a deal. |
| `contracts/[id]/terms/` | GET, POST | Manage custom contractual terms. |
| `contracts/export/` | GET | Export contract registers to spreadsheet formats. |
| `couriers/` | GET, POST | Manage document courier services. |
| `dashboard/` | GET | Key performance indicators, monthly turnover, and contract counts. |
| `deliveries/` | GET, POST | Delivery challan creation and fulfillment against contracts. |
| `deliveries/[id]/` | GET, PUT, DELETE | Update dispatch details, lorry allocations, and charges. |
| `deliveries/export/` | GET | Export dispatch registers. |
| `expense-heads/` | GET, POST | Ledger expense head management. |
| `fiscal-years/` | GET, POST | List and configure accounting periods and locking flags. |
| `ledger/` | GET, POST | Post and query double-entry financial ledger transactions. |
| `ledger/[id]/` | GET, PUT, DELETE | Update or void financial ledger entries. |
| `ledger/export/` | GET | Export statement of accounts. |
| `market/auth/login/` | POST | Authenticate external marketplace members. |
| `market/auth/register/` | POST | Member onboarding and registration. |
| `market/auth/me/` | GET | Marketplace member profile details. |
| `market/bids/` | GET, POST | Place and review bids against open listings. |
| `market/chats/` | GET, POST | Manage trade negotiation chat rooms. |
| `market/chats/[id]/` | GET, POST | Chat room messaging and counter-offer exchanges. |
| `market/chats/[id]/read/` | POST | Mark chat messages as read. |
| `market/commodities/` | GET | Retrieve tradeable commodities active on the exchange. |
| `market/listings/` | GET, POST | Publish and browse marketplace buy/sell listings. |
| `market/listings/[id]/` | GET, PUT, DELETE | Listing details, status toggles, and deletion. |
| `market/members/` | GET | List participating traders and canvassing members. |
| `market/members/funds/` | GET, POST | Ledger balance and margin fund management for members. |
| `market/members/heartbeat/` | POST | Real-time presence and online status tracking. |
| `market/tenders/` | GET, POST | Forward and reverse auction tender notices. |
| `market/tenders/bid/` | POST | Place bids in tender auctions. |
| `market/watchlist/` | GET, POST, DELETE | Manage personal bookmarked listings. |
| `narrations/` | GET, POST | Standard narration templates. |
| `parties/` | GET, POST | Counterparty directory management (buyers, sellers, brokers). |
| `parties/[id]/` | GET, PUT, DELETE | Modify party profiles, bank details, contacts, and tax IDs. |
| `parties/export/` | GET | Export counterparties list. |
| `payments/` | GET, POST | Record inward/outward payment vouchers. |
| `payments/[id]/` | GET, PUT, DELETE | Manage payment records and bill allocations. |
| `payments/export/` | GET | Export payment registers. |
| `pdf/contract/[saudano]/` | GET | Print-ready HTML contract note / Sauda confirmation. |
| `pdf/bill/[id]/` | GET | Print-ready brokerage tax invoice. |
| `pdf/delivery/[id]/` | GET | Print-ready goods dispatch delivery challan. |
| `pdf/payment/[id]/` | GET | Print-ready payment receipt voucher. |
| `proprietors/` | GET, POST | Proprietor master entities. |
| `reports/bill-register/` | GET | Aggregated invoice register reports. |
| `reports/payment-outstanding/` | GET | Accounts receivable and payable aging analysis. |
| `search/parties/` | GET | Fuzzy search over parties using trigram indexing. |
| `search/commodities/` | GET | Fuzzy search over commodities and brands. |
| `status/` | GET | Database connectivity and health check. |
| `terms/` | GET, POST | Terms and conditions masters. |
| `transporters/` | GET, POST | Transporter directory. |
| `users/` | GET, POST | Staff user accounts and RBAC assignments. |
| `users/[id]/` | GET, PUT, DELETE | User credential management and permission modification. |
| `utilities/batch-billing/` | POST | Generate batch invoices from unbilled contract lines. |
| `vehicles/` | GET, POST | Vehicle registration master. |
| `warmup/` | GET | Pre-fetches and caches all workspace data for active company. |
| `warmup/status/` | GET | Memory cache telemetry and hit-rate diagnostics. |

---

## 6. Static Client-Side Assets ([public/static/](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static))

### 6.1 Core Controller & Theme
- [app.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/app.js): Enterprise SPA router and state manager. Coordinates Tinyrouter, authentication guards, multi-company workspace selection modal, dynamic navigation dropdowns, and view mounting.
- [theme.css](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/theme.css): Primary stylesheet for the ERP. Builds upon Oat.ink variables, configuring dark/light themes, mobile responsive drawer navigation, custom tables, card layouts, and modal windows.

### 6.2 Shared Libraries ([public/static/lib/](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/lib))
- [api.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/lib/api.js): Thin HTTP client wrapping the `fetch` API. Injects JWT tokens, attaches `x-company-id` and `x-fiscal-year-id` headers, manages client-side memory caching, and handles toast alerts.
- [autocomplete.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/lib/autocomplete.js): Autocomplete integration wrapping `autocomp.js`. Performs instant local searching across pre-warmed party and commodity lists without extra network latency.

### 6.3 Shared UI Components ([public/static/components/](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/components))
- [ui.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/components/ui.js): Comprehensive UI template component library providing clean inline Feather/Lucide SVG icons, status badges, modal dialogs, data tables, confirm boxes, and currency/date formatters. Strictly follows the zero-emoji rule.
- [virtual-list.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/components/virtual-list.js): High-performance DOM windowing virtual scrolling engine. Renders only the visible rows in view, supporting smooth 60 FPS scrolling over 10,000+ records.

### 6.4 Staff ERP Views ([public/static/views/](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views))

| View File | View Purpose and Capabilities |
| :--- | :--- |
| [admin.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/admin.js) | Administrator console: user account creation, password resets, granular RBAC permission configuration, and security audit log viewer. |
| [analytics.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/analytics.js) | Trading performance analytics: turnover trends, commodity volume breakdowns, top counterparty statistics, and visual metrics. |
| [banks.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/banks.js) | Bank master maintenance: managing company bank accounts, IFSC codes, branches, and ledger linkages. |
| [batch_billing.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/batch_billing.js) | Bulk invoice generation wizard: aggregates unbilled contract lines by party, allowing bulk billing in a single workflow. |
| [bills.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/bills.js) | Invoice management: list, filter, search, view, edit, and trigger print-ready PDF rendering for brokerage bills. |
| [brands.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/brands.js) | Brand master view: managing commodity brands and brand-specific packaging weights. |
| [cities.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/cities.js) | Geographic masters: state, district, and city registers with inline creation and editing. |
| [commodities.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/commodities.js) | Commodity catalog view: managing items, standard packaging types, quality parameters, and HSN codes. |
| [contracts.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/contracts.js) | Core Sauda booking interface: comprehensive multi-party deal entry, line item management, live brokerage calculations, delivery conditions, and print triggers. |
| [dashboard.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/dashboard.js) | Staff home dashboard: overview cards for active contracts, pending deliveries, monthly turnover, and quick action shortcuts. |
| [deliveries.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/deliveries.js) | Dispatch and delivery management: recording lorry dispatches against contracts, weighbridge weights, freight charges, and delivery notes. |
| [expense_heads.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/expense_heads.js) | Expense head categories for accounting and operational cost tracking. |
| [ledger.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/ledger.js) | Financial ledger interface: party and account statements, debit/credit transactions, and running balances. |
| [login.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/login.js) | Clean, credential-based staff authentication screen with enterprise branding. |
| [parties.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/parties.js) | Counterparty directory: list, search, and edit counterparties with sub-panels for GSTINs, bank accounts, delivery stations, and contact persons. |
| [payment_outstanding.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/payment_outstanding.js) | Receivables and payables aging report: aging buckets (0-30, 31-60, 61-90, 90+ days), party-wise totals, and overdue alerts. |
| [payments.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/payments.js) | Cash/Bank voucher entry: payment receipt management and allocation of payments against outstanding bills. |
| [terms.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/terms.js) | Standard terms and conditions library for automatic inclusion in contract notes. |
| [transporters.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/transporters.js) | Logistics carriers directory with contact details, GSTIN, and branch locations. |
| [vehicles.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/views/vehicles.js) | Vehicle registry tracking truck registration numbers and vehicle specifications. |

---

### 6.5 Public Marketplace Frontend ([public/static/market/](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/market))
- [app.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/market/app.js): Marketplace SPA controller with independent routing, member authentication state, and a persistent negotiation chat drawer.
- [market.css](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/market/market.css): Specialized styling for trading tickers, buy/sell badges, order cards, and chat windows.
- [lib/api.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/market/lib/api.js): Marketplace API client handling member tokens (`mkt_token`).
- [lib/ui.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/market/lib/ui.js): Marketplace UI helpers, route transitions, and toast alerts.
- [views/auth.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/market/views/auth.js): Member onboarding, signup, and login interface.
- [views/feed.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/market/views/feed.js): Live trading feed displaying active buy/sell offers and tender notices.
- [views/listing.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/market/views/listing.js): Detailed listing view with real-time bid submission and chat negotiations.
- [views/sell.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/market/views/sell.js): Create listing form allowing members to post commodities for sale or tender.
- [views/watchlist.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/market/views/watchlist.js): Personal saved listings and commodity price tracking.

---

### 6.6 Public Editorial Site ([public/static/site/](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/site))
- [site.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/site/site.js): Vanilla JavaScript handling scroll-reveal animations and sticky navigation transitions via `IntersectionObserver`.
- [site.css](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/site/site.css): Editorial design styling hero banners, feature grids, statistics, and testimonials.

---

### 6.7 Vendor Dependencies ([public/static/vendor/](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/vendor))
- [autocomp.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/vendor/autocomp.js): Standalone, lightweight autocomplete utility by Knadh.
- [oat.min.css](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/vendor/oat.min.css): Minimal semantic CSS foundation by Knadh providing default element styling and design tokens.
- [oat.min.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/vendor/oat.min.js): Companion micro-script for Oat component interactivity.
- [tinyrouter.js](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/public/static/vendor/tinyrouter.js): Minimal client-side SPA router supporting hash and HTML5 pushState routing.

---

## 7. Migration & Developer Scripts ([scripts/](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/scripts))

- [backend-server.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/scripts/backend-server.ts): Development utility server running on port 8001. Provides an HTML/JSON database diagnostics console on `/status` while reverse-proxying active API requests to Next.js on port 3001.
- [enrich_all_party_details.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/scripts/enrich_all_party_details.ts): Enrichment pipeline that parses legacy unnormalized address and contact blobs, populating `party_tax_ids`, `party_contacts`, `party_delivery_addresses`, and `party_bank_details`.
- [generate_phase1_apis.mjs](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/scripts/generate_phase1_apis.mjs): Code generator script used to scaffold standard CRUD API route handlers for master data tables.
- [migrate_legacy.py](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/scripts/migrate_legacy.py): Primary Python migration script transferring legacy SQL Server dumps into PostgreSQL. Maps companies, accounts, deals, deliveries, and billing lines.
- [migrate_all_remaining.py](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/scripts/migrate_all_remaining.py): Python migration script importing remaining auxiliary masters (banks, transporters, vehicles, terms).
- [migrate_all_remaining.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/scripts/migrate_all_remaining.ts): TypeScript/Drizzle equivalent of the auxiliary masters migration script.
- [migrate_party_details.ts](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/scripts/migrate_party_details.ts): TypeScript pipeline dedicated to normalizing complex legacy counterparty data into structured sub-tables.

---

## 8. CI/CD & Deployment Configuration

- [.github/workflows/deploy.yml](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/.github/workflows/deploy.yml): Automated deployment workflow triggered on pushes to the `main` branch. Connects to the AWS Lightsail production host over SSH using secret credentials and executes `/opt/soft-sauda/deploy.sh`.
- [Dockerfile](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/Dockerfile): Production container configuration using Next.js standalone output:
  - Stage 1 (`deps`): Installs production and build dependencies.
  - Stage 2 (`builder`): Compiles Next.js standalone bundle.
  - Stage 3 (`runner`): Strips dev tools, copies `.next/standalone`, public assets, and runs with a non-root `nextjs` user on port 3000.
- [docker-compose.yml](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/docker-compose.yml): Local and staging orchestration running PostgreSQL 16 Alpine container with healthchecks alongside the Next.js web application.
