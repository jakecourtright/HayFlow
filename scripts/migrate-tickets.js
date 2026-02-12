require('dotenv').config({ path: '.env.local' });
const { Pool } = require('@neondatabase/serverless');
const ws = require('ws');
const { neonConfig } = require('@neondatabase/serverless');

neonConfig.webSocketConstructor = ws;

async function migrate() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
        console.log('Creating tickets table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        stack_id INTEGER REFERENCES stacks(id) ON DELETE SET NULL,
        location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
        amount DECIMAL(10, 2) NOT NULL,
        customer VARCHAR(255),
        notes TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        invoice_id INTEGER,
        transaction_id INTEGER,
        driver_id VARCHAR(255) NOT NULL,
        org_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('✓ tickets table created');

        console.log('Creating invoices table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(100),
        customer VARCHAR(255),
        status VARCHAR(50) DEFAULT 'draft',
        total_amount DECIMAL(12, 2) DEFAULT 0,
        notes TEXT,
        created_by VARCHAR(255) NOT NULL,
        org_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('✓ invoices table created');

        // Add foreign key from tickets to invoices
        console.log('Adding foreign key constraint...');
        await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_tickets_invoice'
        ) THEN
          ALTER TABLE tickets ADD CONSTRAINT fk_tickets_invoice
            FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
        console.log('✓ foreign key added');

        // Add foreign key from tickets to transactions
        await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_tickets_transaction'
        ) THEN
          ALTER TABLE tickets ADD CONSTRAINT fk_tickets_transaction
            FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
        console.log('✓ transaction foreign key added');

        // Create indexes
        console.log('Creating indexes...');
        await client.query('CREATE INDEX IF NOT EXISTS idx_tickets_org_id ON tickets(org_id);');
        await client.query('CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status, org_id);');
        await client.query('CREATE INDEX IF NOT EXISTS idx_tickets_driver ON tickets(driver_id, org_id);');
        await client.query('CREATE INDEX IF NOT EXISTS idx_tickets_invoice ON tickets(invoice_id);');
        await client.query('CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON invoices(org_id);');
        await client.query('CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status, org_id);');
        console.log('✓ indexes created');

        console.log('\n✅ Migration complete!');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
