// One-off: backfill transactions.line_total (actual USD per ledger line).
//
// Phase A of the "money lives on the sale" refactor moved revenue/cost off the
// fragile `amount × weight/2000 × price` formula and onto a stored line_total.
// New writes populate it; this reconstructs it for historical rows so the
// dashboard/reports don't show a cliff.
//
// Rules (mirrors lib/units.ts resolveLineRate + lineAmount):
//   - Sale ticket that's on an invoice  -> price from the ticket's own rate,
//       else the invoice rate; amount via net_lbs (ton) or bales (bale).
//       Per-ton lines with no net_lbs estimate from bales × stack weight/bale
//       (never $0 for a priced line).
//   - Everything else (/log sales+purchases, approved-but-unbilled, transfers)
//       -> amount(bales) × weight_per_bale/2000 × price($/ton).
//       (price is 0 for transfers and unbilled sales, so they come out $0.)
//
// Idempotent: recomputes from source each run. Run AFTER `npm run migrate`
// (which adds the line_total column). Run with:
//   node scripts/backfill-line-total.js
const { Pool } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

function resolveLineRate(tRate, tUnit, iRate, iUnit) {
    const t = Number(tRate) || 0;
    if (t > 0) return { rate: t, unit: tUnit === 'bale' ? 'bale' : 'ton' };
    return { rate: Number(iRate) || 0, unit: iUnit === 'bale' ? 'bale' : 'ton' };
}

function lineAmount(bales, netLbs, rate, unit, estLbsPerBale = 0) {
    if (!rate || rate <= 0) return 0;
    if (unit === 'bale') return bales * rate;
    const lbs = netLbs > 0 ? netLbs : bales * estLbsPerBale;
    return (lbs / 2000) * rate;
}

async function backfill() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
        const { rows } = await client.query(`
            SELECT
                tx.id              AS tx_id,
                tx.type            AS tx_type,
                tx.amount          AS tx_amount,
                tx.price           AS tx_price,
                COALESCE(s.weight_per_bale, 1200) AS weight_per_bale,
                tk.id              AS ticket_id,
                tk.amount          AS ticket_amount,
                tk.net_lbs         AS net_lbs,
                tk.price_per_unit  AS tk_ppu,
                tk.price_unit      AS tk_pu,
                tk.invoice_id      AS invoice_id,
                inv.price_per_unit AS inv_ppu,
                inv.price_unit     AS inv_pu
            FROM transactions tx
            LEFT JOIN stacks   s   ON s.id  = tx.stack_id
            LEFT JOIN tickets  tk  ON tk.transaction_id = tx.id
            LEFT JOIN invoices inv ON inv.id = tk.invoice_id
            WHERE tx.type IN ('sale', 'purchase')
        `);

        console.log(`Found ${rows.length} sale/purchase transaction(s) to recompute.`);

        let updated = 0;
        let totalRevenue = 0;
        let totalCost = 0;

        for (const r of rows) {
            let lineTotal;
            if (r.ticket_id && r.invoice_id) {
                const { rate, unit } = resolveLineRate(r.tk_ppu, r.tk_pu, r.inv_ppu, r.inv_pu);
                lineTotal = lineAmount(Number(r.ticket_amount), Number(r.net_lbs) || 0, rate, unit, Number(r.weight_per_bale) || 0);
            } else {
                lineTotal = (Number(r.tx_amount) * Number(r.weight_per_bale) / 2000) * (Number(r.tx_price) || 0);
            }
            lineTotal = Math.round(lineTotal * 100) / 100;

            await client.query(
                'UPDATE transactions SET line_total = $1 WHERE id = $2',
                [lineTotal, r.tx_id]
            );
            updated++;
            if (r.tx_type === 'sale') totalRevenue += lineTotal;
            else if (r.tx_type === 'purchase') totalCost += lineTotal;
        }

        console.log(`\nUpdated line_total on ${updated} row(s).`);
        console.log(`  Reconstructed revenue (sales):   $${totalRevenue.toFixed(2)}`);
        console.log(`  Reconstructed cost (purchases):  $${totalCost.toFixed(2)}`);
    } finally {
        client.release();
        await pool.end();
    }
}

backfill().catch(e => { console.error(e); process.exit(1); });
