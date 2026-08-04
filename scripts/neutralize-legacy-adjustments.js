// One-off: neutralize the 3 pre-launch adjustment rows (forward-only cutover).
//
// 2026-08-04: adjustments became signed inventory deltas counted in all stock
// math. The three adjustment rows that existed before then (May 2026, entered
// when adjustments were inert notes) have unknowable intent — one (id 76,
// 800 bales on "Unit 78 1st") is a duplicate of a later production entry and
// would double that stack if counted. This zeroes their amounts so they never
// count under the new semantics, preserving the original figure in the entity
// note for the ledger display.
//
// Idempotent: targets the 3 known row ids and skips rows already zeroed.
// Run with: node scripts/neutralize-legacy-adjustments.js
const { Pool } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const LEGACY_IDS = [72, 76, 80];

async function run() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
        const { rows } = await client.query(
            `SELECT id, amount, entity FROM transactions
             WHERE id = ANY($1) AND type = 'adjustment' AND amount <> 0
             ORDER BY id`,
            [LEGACY_IDS]
        );
        if (rows.length === 0) {
            console.log('Nothing to do — legacy adjustment rows already neutralized (or not found).');
            return;
        }
        for (const r of rows) {
            const note = `${(r.entity || '').trim()} [legacy pre-cutover adjustment: ${Number(r.amount)} bales, not counted]`.trim();
            await client.query(
                'UPDATE transactions SET amount = 0, entity = $1 WHERE id = $2',
                [note, r.id]
            );
            console.log(`  tx ${r.id}: amount ${r.amount} -> 0, note: "${note}"`);
        }
        console.log(`\nNeutralized ${rows.length} legacy adjustment row(s).`);
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(e => { console.error(e); process.exit(1); });
