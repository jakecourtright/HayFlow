import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect } from "next/navigation";
import TicketForm from "./TicketForm";

async function getData(orgId: string) {
    const client = await pool.connect();
    try {
        const stacks = await client.query('SELECT * FROM stacks WHERE org_id = $1 ORDER BY name ASC', [orgId]);
        const locations = await client.query('SELECT * FROM locations WHERE org_id = $1 ORDER BY name ASC', [orgId]);

        // Get current inventory per stack/location for validation display
        const inventoryRes = await client.query(`
            SELECT 
                stack_id, 
                location_id, 
                SUM(CASE 
                    WHEN type IN ('production', 'purchase') THEN amount 
                    WHEN type IN ('sale') THEN -amount 
                    ELSE 0 
                END) as quantity
            FROM transactions
            WHERE org_id = $1 AND location_id IS NOT NULL
            GROUP BY stack_id, location_id
            HAVING SUM(CASE 
                WHEN type IN ('production', 'purchase') THEN amount 
                WHEN type IN ('sale') THEN -amount 
                ELSE 0 
            END) > 0
        `, [orgId]);

        return {
            stacks: stacks.rows,
            locations: locations.rows,
            inventory: inventoryRes.rows,
        };
    } finally {
        client.release();
    }
}

export default async function NewTicketPage() {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    const data = await getData(orgId);

    return (
        <div>
            <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--accent)' }}>New Ticket</h1>
            <TicketForm stacks={data.stacks} locations={data.locations} inventory={data.inventory} />
        </div>
    );
}
