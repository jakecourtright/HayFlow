// One-off: NULL out trial_started_at for all org_billing rows.
//
// Pre-launch these were stamped at org creation (legacy NOT NULL DEFAULT now()),
// which desynced our trial countdown from Clerk. With the new logic the column is
// re-stamped the first time we observe an active subscription, so clearing it lets
// each org's clock realign at subscribe time. Safe pre-launch (test data only).
//
// Run AFTER `npm run migrate` (which drops the NOT NULL/default). Run with:
//   node scripts/reset-trial-clocks.js
const { Pool } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function reset() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
        const before = await client.query(
            `SELECT org_id, trial_started_at FROM org_billing ORDER BY trial_started_at`
        );
        console.log(`--- before (${before.rows.length} rows) ---`);
        for (const r of before.rows) console.log(`  ${r.org_id}  ${r.trial_started_at}`);

        const res = await client.query(
            `UPDATE org_billing SET trial_started_at = NULL WHERE trial_started_at IS NOT NULL`
        );
        console.log(`\nCleared trial_started_at on ${res.rowCount} row(s).`);
        console.log('Each org re-stamps now() on the next active-subscription detection.');
    } finally {
        client.release();
        await pool.end();
    }
}

reset().catch(e => { console.error(e); process.exit(1); });
