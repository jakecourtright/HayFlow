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
