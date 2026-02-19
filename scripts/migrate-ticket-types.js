require('dotenv').config({ path: '.env.local' });
const { Pool } = require('@neondatabase/serverless');
const ws = require('ws');
const { neonConfig } = require('@neondatabase/serverless');

neonConfig.webSocketConstructor = ws;

async function migrate() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
        console.log('Adding ticket type columns...');

        // Add type column (default 'sale' for existing tickets)
        await client.query(`
            ALTER TABLE tickets ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'sale';
        `);
        console.log('✓ type column added');

        // Add net_lbs column (for Sale tickets — total net weight from scale)
        await client.query(`
            ALTER TABLE tickets ADD COLUMN IF NOT EXISTS net_lbs DECIMAL(12, 2);
        `);
        console.log('✓ net_lbs column added');

        // Add destination_id column (for Barn to Barn — where bales are going)
        await client.query(`
            ALTER TABLE tickets ADD COLUMN IF NOT EXISTS destination_id INTEGER REFERENCES locations(id) ON DELETE SET NULL;
        `);
        console.log('✓ destination_id column added');

        // Create index on type
        await client.query('CREATE INDEX IF NOT EXISTS idx_tickets_type ON tickets(type, org_id);');
        console.log('✓ index created');

        console.log('\n✅ Ticket types migration complete!');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
