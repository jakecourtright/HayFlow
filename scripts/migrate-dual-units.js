const { Pool } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function addDualUnitColumns() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is missing. Please set it in .env.local');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL
    });

    try {
        console.log('Adding dual unit columns...\n');

        // Add columns to stacks table
        console.log('Updating stacks table...');
        await pool.query(`
            ALTER TABLE stacks 
            ADD COLUMN IF NOT EXISTS weight_per_bale INTEGER,
            ADD COLUMN IF NOT EXISTS price_unit VARCHAR(20) DEFAULT 'bale';
        `);
        console.log('  ✓ Added weight_per_bale and price_unit columns');

        // Update bale_size values to new format
        console.log('\nUpdating bale_size values to new format...');
        await pool.query(`
            UPDATE stacks SET bale_size = '3x4' WHERE bale_size = '3x4x8';
            UPDATE stacks SET bale_size = '3x3' WHERE bale_size = '3x3x8';
            UPDATE stacks SET bale_size = '4x4' WHERE bale_size = 'Round';
            UPDATE stacks SET bale_size = '3-Tie' WHERE bale_size = 'Small Square';
        `);
        console.log('  ✓ Updated bale_size values');

        // Add capacity_unit to locations table
        console.log('\nUpdating locations table...');
        await pool.query(`
            ALTER TABLE locations
            ADD COLUMN IF NOT EXISTS capacity_unit VARCHAR(20) DEFAULT 'bales';
        `);
        console.log('  ✓ Added capacity_unit column');

        // Verify changes
        console.log('\nVerifying stacks columns...');
        const stackCols = await pool.query(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'stacks' 
            AND column_name IN ('weight_per_bale', 'price_unit', 'bale_size')
            ORDER BY column_name;
        `);
        stackCols.rows.forEach((row) => {
            console.log(`  ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'none'})`);
        });

        console.log('\nVerifying locations columns...');
        const locCols = await pool.query(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'locations' 
            AND column_name = 'capacity_unit';
        `);
        locCols.rows.forEach((row) => {
            console.log(`  ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'none'})`);
        });

        console.log('\n✅ Migration successful!');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

addDualUnitColumns();
