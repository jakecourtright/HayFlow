const { Pool } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function inspect() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
        const tables = [
            'locations', 'stacks', 'transactions', 'tickets', 'invoices',
            'business_profiles', 'org_billing', 'user_preferences',
        ];
        console.log('--- row counts by table ---');
        for (const t of tables) {
            try {
                const r = await client.query(`SELECT COUNT(*)::int AS n FROM ${t}`);
                console.log(`${t.padEnd(22)} ${r.rows[0].n}`);
            } catch (e) {
                console.log(`${t.padEnd(22)} (missing or error: ${e.message})`);
            }
        }
        console.log('\n--- distinct org_ids in transactions ---');
        const orgs = await client.query(`SELECT org_id, COUNT(*)::int AS rows FROM transactions GROUP BY org_id`);
        for (const row of orgs.rows) console.log(`  ${row.org_id}  ${row.rows} txns`);

        console.log('\n--- distinct user_ids in transactions ---');
        const users = await client.query(`SELECT user_id, COUNT(*)::int AS rows FROM transactions GROUP BY user_id`);
        for (const row of users.rows) console.log(`  ${row.user_id}  ${row.rows} txns`);

        console.log('\n--- org_billing rows ---');
        const billing = await client.query(`SELECT org_id, trial_started_at, trial_days FROM org_billing`);
        for (const row of billing.rows) console.log(`  ${row.org_id}  trial_started=${row.trial_started_at}  days=${row.trial_days}`);
    } finally {
        client.release();
        await pool.end();
    }
}

inspect().catch(e => { console.error(e); process.exit(1); });
