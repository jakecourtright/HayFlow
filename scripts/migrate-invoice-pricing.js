require('dotenv').config({ path: '.env.local' });
const { Pool } = require('@neondatabase/serverless');
const ws = require('ws');
const { neonConfig } = require('@neondatabase/serverless');

neonConfig.webSocketConstructor = ws;

async function migrate() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
        console.log('Adding pricing columns to invoices...');

        await client.query(`
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS price_per_unit DECIMAL(12, 2);
        `);
        console.log('✓ price_per_unit column added');

        await client.query(`
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS price_unit VARCHAR(20) DEFAULT 'ton';
        `);
        console.log('✓ price_unit column added');

        console.log('\n✅ Invoice pricing migration complete!');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
