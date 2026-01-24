const { Pool } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function migrate() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is missing');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL
    });

    try {
        console.log('Starting migration: Adding org_id to tables...');

        const tables = ['stacks', 'locations', 'transactions'];

        for (const table of tables) {
            console.log(`Migrating ${table}...`);
            // Add org_id column if it doesn't exist
            await pool.query(`
                ALTER TABLE ${table} 
                ADD COLUMN IF NOT EXISTS org_id TEXT;
            `);
            console.log(`Added org_id to ${table}`);
        }

        console.log('Migration complete!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
}

migrate();
