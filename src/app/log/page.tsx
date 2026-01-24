import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect } from "next/navigation";
import LogForm from "./LogForm";

async function getData(userId: string, orgId: string) {
    const client = await pool.connect();
    try {
        const stacks = await client.query('SELECT * FROM stacks WHERE org_id = $1 ORDER BY name ASC', [orgId]);
        const locations = await client.query('SELECT * FROM locations WHERE org_id = $1 ORDER BY name ASC', [orgId]);
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
            inventory: inventoryRes.rows
        };
    } finally {
        client.release();
    }
}

interface Props {
    searchParams: Promise<{ type?: string }>;
}

export default async function LogPage({ searchParams }: Props) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    const resolvedSearchParams = await searchParams;
    const type = resolvedSearchParams.type;

    const data = await getData(userId, orgId);

    // Dynamic Title
    const getTitle = (t?: string) => {
        switch (t) {
            case 'production': return 'Record Production (Bale)';
            case 'sale': return 'Record Sale';
            case 'purchase': return 'Record Purchase';
            case 'adjustment': return 'Record Adjustment';
            default: return 'New Log Entry';
        }
    }

    return (
        <div>
            <h1 className="text-xl font-bold mb-6">{getTitle(type)}</h1>
            <LogForm key={type} stacks={data.stacks} locations={data.locations} inventory={data.inventory} type={type} />
        </div>
    );
}
