// One-off: re-date ticket-linked transactions to the ticket's creation date.
//
// approveTicket used to let transactions.date default to CURRENT_TIMESTAMP
// (the approval click), so tickets approved late booked their sale/transfer
// into the wrong month — e.g. July sales stuck behind the insufficient-stock
// bug were approved Aug 1 and showed up as August revenue.
//
// The app now stamps ledger rows with the ticket's created_at (when the bales
// actually left the barn). This backfills the same date onto historical rows.
//
// Idempotent: only touches rows whose date differs from the ticket's. Run with:
//   node scripts/backfill-transaction-dates.js
const { Pool } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function backfill() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
        const preview = await client.query(`
            SELECT tx.id, tx.type, tx.date AS tx_date, tk.created_at AS ticket_date
            FROM transactions tx
            JOIN tickets tk ON tk.transaction_id = tx.id AND tk.org_id = tx.org_id
            WHERE tx.date <> tk.created_at
            ORDER BY tx.id
        `);
        if (preview.rows.length === 0) {
            console.log('Nothing to do — every ticket-linked transaction already matches its ticket date.');
            return;
        }
        for (const r of preview.rows) {
            console.log(`  tx ${r.id} (${r.type}): ${new Date(r.tx_date).toISOString().slice(0, 10)} -> ${new Date(r.ticket_date).toISOString().slice(0, 10)}`);
        }

        const res = await client.query(`
            UPDATE transactions tx
            SET date = tk.created_at
            FROM tickets tk
            WHERE tk.transaction_id = tx.id
              AND tk.org_id = tx.org_id
              AND tx.date <> tk.created_at
        `);
        console.log(`\nRe-dated ${res.rowCount} transaction(s) to their ticket's date.`);
    } finally {
        client.release();
        await pool.end();
    }
}

backfill().catch(e => { console.error(e); process.exit(1); });
