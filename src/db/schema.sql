-- HayFlow consolidated schema — source of truth
-- user_id and org_id are Clerk IDs stored as VARCHAR(255)
-- Run with: npm run migrate

-- ============================================================
-- Locations (barns / storage facilities)
-- ============================================================
CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  capacity INTEGER NOT NULL,
  unit VARCHAR(50) DEFAULT 'bales',
  capacity_unit VARCHAR(20) DEFAULT 'bales',      -- 'bales' | 'tons'
  user_id VARCHAR(255) NOT NULL,
  org_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Stacks (products / lot numbers)
-- ============================================================
CREATE TABLE IF NOT EXISTS stacks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  commodity VARCHAR(255),
  bale_size VARCHAR(100),                          -- '3x3' | '3x4' | '4x4' | '2-Tie' | '3-Tie'
  quality VARCHAR(100),
  base_price DECIMAL(10, 2) DEFAULT 0,
  weight_per_bale INTEGER,                         -- lbs per bale (overrides bale_size default)
  price_unit VARCHAR(20) DEFAULT 'bale',           -- 'bale' | 'ton'
  user_id VARCHAR(255) NOT NULL,
  org_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  archived_at TIMESTAMP                            -- soft-delete: NULL = active; timestamp = archived (hidden from active lists/pickers, history kept)
);

-- Backfill column on pre-existing stacks tables (idempotent)
ALTER TABLE stacks ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

-- ============================================================
-- Transactions (inventory ledger)
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  type VARCHAR(50) NOT NULL,                       -- 'production' | 'purchase' | 'sale' | 'adjustment' | 'transfer_in' | 'transfer_out'
                                                   -- transfer_in/out are paired legs of a barn-to-barn move (price 0); excluded from sales/purchase reports
  stack_id INTEGER REFERENCES stacks(id) ON DELETE SET NULL,
  location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,                  -- always in bales
  unit VARCHAR(50),                                -- always 'bales'
  entity VARCHAR(255),                             -- buyer or seller
  price DECIMAL(10, 2) DEFAULT 0,                  -- always stored as $/ton
  line_total DECIMAL(12, 2) DEFAULT 0,             -- actual USD for this line: revenue (sale) / cost (purchase); 0 for production/adjustment/transfer
  user_id VARCHAR(255) NOT NULL,
  org_id VARCHAR(255) NOT NULL
);

-- Backfill column on pre-existing transactions tables (idempotent)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS line_total DECIMAL(12, 2) DEFAULT 0;

-- ============================================================
-- User preferences (dashboard layout, theme, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  org_id VARCHAR(255) NOT NULL,
  preference_key VARCHAR(100) NOT NULL,
  preference_value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, org_id, preference_key)
);

-- ============================================================
-- Tickets (driver-created removal requests)
-- ============================================================
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) DEFAULT 'sale',                 -- 'sale' | 'barn_to_barn'
  stack_id INTEGER REFERENCES stacks(id) ON DELETE SET NULL,
  location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,   -- source
  destination_id INTEGER REFERENCES locations(id) ON DELETE SET NULL, -- barn_to_barn only
  amount DECIMAL(10, 2) NOT NULL,                  -- bales (canonical)
  net_lbs DECIMAL(12, 2),                          -- scale weight (optional, sale only)
  price_per_unit DECIMAL(10, 2),                   -- per-line rate (Quick Sale multi-item); NULL = use invoice rate
  price_unit VARCHAR(20),                          -- 'bale' | 'ton' for this line; NULL = use invoice price_unit
  customer VARCHAR(255),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pending',            -- 'pending' | 'approved' | 'rejected' | 'invoiced'
  invoice_id INTEGER,
  transaction_id INTEGER,
  driver_id VARCHAR(255) NOT NULL,
  org_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Backfill columns on pre-existing tickets tables (idempotent)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'sale';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS net_lbs DECIMAL(12, 2);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS destination_id INTEGER REFERENCES locations(id) ON DELETE SET NULL;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS price_per_unit DECIMAL(10, 2);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS price_unit VARCHAR(20);

-- ============================================================
-- Invoices (bookkeeper-compiled collections of approved tickets)
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(100),
  customer VARCHAR(255),
  status VARCHAR(50) DEFAULT 'draft',              -- 'draft' | 'sent' | 'paid'
  total_amount DECIMAL(12, 2) DEFAULT 0,
  price_per_unit DECIMAL(10, 2),
  price_unit VARCHAR(20) DEFAULT 'ton',            -- 'bale' | 'ton'
  notes TEXT,
  share_token VARCHAR(128),                        -- 32-byte hex (256-bit entropy)
  share_token_expires_at TIMESTAMP,                -- optional expiry; null = no expiry
  created_by VARCHAR(255) NOT NULL,
  org_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Backfill columns on pre-existing invoices tables (idempotent)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS price_per_unit DECIMAL(10, 2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS price_unit VARCHAR(20) DEFAULT 'ton';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS share_token VARCHAR(128);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS share_token_expires_at TIMESTAMP;

-- ============================================================
-- Business profile (one per org — rendered as "From" block on invoices)
-- ============================================================
CREATE TABLE IF NOT EXISTS business_profiles (
  id SERIAL PRIMARY KEY,
  org_id VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),                               -- business/legal name
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(120),
  state VARCHAR(60),
  zip VARCHAR(20),
  phone VARCHAR(40),
  email VARCHAR(255),
  payment_instructions TEXT,                       -- "Make checks payable to... / Venmo @... / routing/account"
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(255)
);

-- ============================================================
-- Org billing (local mirror for trial countdown UX; Clerk Billing is source of truth for access)
-- ============================================================
CREATE TABLE IF NOT EXISTS org_billing (
  org_id VARCHAR(255) PRIMARY KEY,
  trial_started_at TIMESTAMP,                      -- stamped at first active-sub detection; NULL until then
  trial_days INTEGER NOT NULL DEFAULT 14,
  grace_days INTEGER NOT NULL DEFAULT 7,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Legacy DBs stamped trial_started_at at org creation (NOT NULL DEFAULT now()), which
-- desynced our countdown from Clerk. Drop both so the column stays NULL until we first
-- observe an active subscription, then stamp it once (see getSubscriptionState in lib/billing.ts).
ALTER TABLE org_billing ALTER COLUMN trial_started_at DROP DEFAULT;
ALTER TABLE org_billing ALTER COLUMN trial_started_at DROP NOT NULL;

-- ============================================================
-- App-level roles — one row per org member (admin | bookkeeper | driver).
-- Roles live here (not in Clerk) so we don't need Clerk's custom-roles
-- add-on. Clerk still owns authN + org membership; lib/permissions.ts
-- resolves the role and derives permissions from it.
-- ============================================================
CREATE TABLE IF NOT EXISTS org_member_roles (
  org_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'bookkeeper', 'driver')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (org_id, user_id)
);

-- Role recorded at invite time, keyed by email. Consumed (deleted) the first
-- time the invited user's role is resolved after they join the org.
CREATE TABLE IF NOT EXISTS org_invited_roles (
  org_id VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'bookkeeper', 'driver')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (org_id, email)
);

-- ============================================================
-- Support requests — Help assistant "Reach the team" escalations.
-- Persisted so a request is never lost even if the email send fails.
-- ============================================================
CREATE TABLE IF NOT EXISTS support_requests (
  id SERIAL PRIMARY KEY,
  org_id VARCHAR(255),
  user_id VARCHAR(255),
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  reply_to VARCHAR(255),
  message TEXT NOT NULL,
  transcript JSONB,
  page TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  emailed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Invoice numbering counter (monotonic per org; race-safe).
-- Seeded from existing invoices on first use, incremented atomically thereafter.
-- Replaces COUNT(*)+1 numbering, which both raced under concurrency and reused
-- numbers after an invoice was deleted.
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_counters (
  org_id VARCHAR(255) PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- Foreign keys (added via ALTER so table creation order is flexible)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tickets_invoice') THEN
    ALTER TABLE tickets ADD CONSTRAINT fk_tickets_invoice
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tickets_transaction') THEN
    ALTER TABLE tickets ADD CONSTRAINT fk_tickets_transaction
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;
  END IF;
END$$;

-- ============================================================
-- Type normalization — heals drift left by legacy ad-hoc scripts.
-- Some live tables got org_id added as TEXT (scripts/migrate_orgs.js) or were
-- created by hand, while this schema declares VARCHAR(255). Mixed types break
-- any query that binds one parameter against org_id on two tables at once
-- (Postgres 42P08 "inconsistent types deduced for parameter"). Only touches
-- columns that are actually text, so re-runs are no-ops.
-- ============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name IN ('org_id', 'user_id')
      AND data_type = 'text'
  LOOP
    EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE VARCHAR(255)', r.table_name, r.column_name);
  END LOOP;
END$$;

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_locations_org_id ON locations(org_id);
CREATE INDEX IF NOT EXISTS idx_stacks_org_id ON stacks(org_id);
CREATE INDEX IF NOT EXISTS idx_transactions_org_id ON transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_transactions_stack_location ON transactions(stack_id, location_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_lookup ON user_preferences(user_id, org_id, preference_key);
CREATE INDEX IF NOT EXISTS idx_tickets_org_id ON tickets(org_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status, org_id);
CREATE INDEX IF NOT EXISTS idx_tickets_driver ON tickets(driver_id, org_id);
CREATE INDEX IF NOT EXISTS idx_tickets_invoice ON tickets(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status, org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_share_token ON invoices(share_token) WHERE share_token IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_profiles_org ON business_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_org_billing_trial_started ON org_billing(trial_started_at);
CREATE INDEX IF NOT EXISTS idx_support_requests_org ON support_requests(org_id, created_at);
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON support_requests(status, created_at);
