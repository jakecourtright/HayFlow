-- Users Table (managed by Clerk, but referenced for foreign keys)
-- Note: user_id and org_id are Clerk IDs stored as VARCHAR

-- Locations Table
CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  capacity INTEGER NOT NULL,
  unit VARCHAR(50) DEFAULT 'bales',
  capacity_unit VARCHAR(20) DEFAULT 'bales', -- 'bales' or 'tons'
  user_id VARCHAR(255) NOT NULL,
  org_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stacks (Products/Lot Numbers) Table
CREATE TABLE IF NOT EXISTS stacks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  commodity VARCHAR(255),
  bale_size VARCHAR(100), -- '3x3', '3x4', '4x4', '2-Tie', '3-Tie'
  quality VARCHAR(100),
  base_price DECIMAL(10, 2) DEFAULT 0,
  weight_per_bale INTEGER, -- lbs per bale (overrides bale_size default)
  price_unit VARCHAR(20) DEFAULT 'bale', -- 'bale' or 'ton'
  user_id VARCHAR(255) NOT NULL,
  org_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  type VARCHAR(50) NOT NULL, -- 'production', 'purchase', 'sale', 'adjustment'
  stack_id INTEGER REFERENCES stacks(id) ON DELETE SET NULL,
  location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50),
  entity VARCHAR(255), -- Buyer or seller name
  price DECIMAL(10, 2) DEFAULT 0,
  user_id VARCHAR(255) NOT NULL,
  org_id VARCHAR(255) NOT NULL
);

-- Indexes for performance on org_id queries
CREATE INDEX IF NOT EXISTS idx_locations_org_id ON locations(org_id);
CREATE INDEX IF NOT EXISTS idx_stacks_org_id ON stacks(org_id);
CREATE INDEX IF NOT EXISTS idx_transactions_org_id ON transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_transactions_stack_location ON transactions(stack_id, location_id);

-- User Preferences (dashboard layout, settings, etc.)
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  org_id VARCHAR(255) NOT NULL,
  preference_key VARCHAR(100) NOT NULL,
  preference_value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, org_id, preference_key)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_lookup 
ON user_preferences(user_id, org_id, preference_key);

-- Tickets: Driver-created removal requests staged for invoicing
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  stack_id INTEGER REFERENCES stacks(id) ON DELETE SET NULL,
  location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,       -- bales (canonical)
  customer VARCHAR(255),                 -- who it's going to
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pending',  -- pending, approved, rejected, invoiced
  invoice_id INTEGER,                    -- NULL until added to an invoice
  transaction_id INTEGER,                -- Links to the sale transaction created on approval
  driver_id VARCHAR(255) NOT NULL,       -- Clerk user ID of creating driver
  org_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices: Bookkeeper-compiled collections of approved tickets
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(100),
  customer VARCHAR(255),
  status VARCHAR(50) DEFAULT 'draft',    -- draft, sent, paid
  total_amount DECIMAL(12, 2) DEFAULT 0,
  notes TEXT,
  created_by VARCHAR(255) NOT NULL,
  org_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FK: tickets -> invoices
ALTER TABLE tickets ADD CONSTRAINT fk_tickets_invoice
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

-- FK: tickets -> transactions  
ALTER TABLE tickets ADD CONSTRAINT fk_tickets_transaction
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_org_id ON tickets(org_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status, org_id);
CREATE INDEX IF NOT EXISTS idx_tickets_driver ON tickets(driver_id, org_id);
CREATE INDEX IF NOT EXISTS idx_tickets_invoice ON tickets(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status, org_id);
