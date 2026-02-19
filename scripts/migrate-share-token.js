require('dotenv').config({ path: '.env.local' });
const { Pool } = require('@neondatabase/serverless');
const ws = require('ws');
const { neonConfig } = require('@neondatabase/serverless');
const crypto = require('crypto');

neonConfig.webSocketConstructor = ws;

async function migrate() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
        console.log('Adding share_token column to invoices...');

        await client.query(`
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS share_token VARCHAR(64) UNIQUE;
        `);
        console.log('✓ share_token column added');

        // Generate tokens for existing invoices
        const existing = await client.query('SELECT id FROM invoices WHERE share_token IS NULL');
        for (const row of existing.rows) {
            const token = crypto.randomBytes(32).toString('hex');
            await client.query('UPDATE invoices SET share_token = $1 WHERE id = $2', [token, row.id]);
        }
        console.log(`✓ Generated tokens for ${existing.rows.length} existing invoices`);

        console.log('\n✅ Share token migration complete!');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
