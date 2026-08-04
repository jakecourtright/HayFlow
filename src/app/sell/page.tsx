import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect } from "next/navigation";
import { Permissions, checkPermission } from "@/lib/permissions";
import QuickSaleForm from "./QuickSaleForm";
import HelpTip from "@/components/ui/HelpTip";

async function getData(orgId: string) {
    const client = await pool.connect();
    try {
        const stacks = await client.query('SELECT * FROM stacks WHERE org_id = $1 AND archived_at IS NULL ORDER BY name ASC', [orgId]);
        const locations = await client.query('SELECT * FROM locations WHERE org_id = $1 ORDER BY name ASC', [orgId]);
        const inventoryRes = await client.query(`
            SELECT 
                stack_id, 
                location_id, 
                SUM(CASE 
                    WHEN type IN ('production', 'purchase', 'transfer_in', 'adjustment') THEN amount 
                    WHEN type IN ('sale', 'transfer_out') THEN -amount 
                    ELSE 0 
                END) as quantity
            FROM transactions
            WHERE org_id = $1 AND location_id IS NOT NULL
            GROUP BY stack_id, location_id
            HAVING SUM(CASE 
                WHEN type IN ('production', 'purchase', 'transfer_in', 'adjustment') THEN amount 
                WHEN type IN ('sale', 'transfer_out') THEN -amount 
                ELSE 0 
            END) > 0
        `, [orgId]);

        return {
            stacks: stacks.rows,
            locations: locations.rows,
            inventory: inventoryRes.rows
        };
    } finally {
        client.release();
    }
}

export default async function QuickSalePage() {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");
    // Quick Sale creates an invoice on the spot — office only. Drivers sell by
    // filing a field ticket that routes to the office for approval.
    if (!(await checkPermission(Permissions.INVOICES_MANAGE))) redirect("/tickets/new");

    const data = await getData(orgId);

    return (
        <div>
            <h1 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--accent)' }}>
                Quick Sale
                <HelpTip learnMoreHref="/help/quick-sale">
                    Quick Sale sells hay and creates the invoice in one step — it records the sale, drops your stock, and gives you a share link for the customer. No separate ticket or approval needed.
                </HelpTip>
            </h1>
            <QuickSaleForm stacks={data.stacks} locations={data.locations} inventory={data.inventory} />
        </div>
    );
}
