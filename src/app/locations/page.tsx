import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import LocationCard from "./LocationCard";
import { getDefaultWeight } from "@/lib/units";

async function getLocationsWithInventory(orgId: string) {
    const client = await pool.connect();
    try {
        const locations = await client.query(
            'SELECT * FROM locations WHERE org_id = $1 ORDER BY name ASC',
            [orgId]
        );

        // Get inventory with weight info for tonnage calculation
        const inventoryQuery = await client.query(`
            SELECT 
                t.location_id,
                t.stack_id,
                s.weight_per_bale,
                s.bale_size,
                COALESCE(SUM(
                    CASE 
                        WHEN t.type IN ('production', 'purchase') THEN t.amount
                        WHEN t.type = 'sale' THEN -t.amount
                        ELSE 0
                    END
                ), 0) as stock
            FROM transactions t
            LEFT JOIN stacks s ON s.id = t.stack_id
            WHERE t.org_id = $1 AND t.location_id IS NOT NULL
            GROUP BY t.location_id, t.stack_id, s.weight_per_bale, s.bale_size
        `, [orgId]);

        // Aggregate by location with tonnage
        const inventoryMap: Record<string, { total_stock: number; stack_count: number; total_tons: number }> = {};
        inventoryQuery.rows.forEach((row: any) => {
            const locId = row.location_id;
            const stock = parseFloat(row.stock) || 0;
            const weight = row.weight_per_bale || getDefaultWeight(row.bale_size || '3x4');
            const tons = (stock * weight) / 2000;

            if (!inventoryMap[locId]) {
                inventoryMap[locId] = { total_stock: 0, stack_count: 0, total_tons: 0 };
            }
            inventoryMap[locId].total_stock += stock;
            inventoryMap[locId].total_tons += tons;
            if (stock > 0) inventoryMap[locId].stack_count += 1;
        });

        return locations.rows.map((loc: any) => ({
            ...loc,
            total_stock: inventoryMap[loc.id]?.total_stock || 0,
            stack_count: inventoryMap[loc.id]?.stack_count || 0,
            total_tons: inventoryMap[loc.id]?.total_tons || 0
        }));
    } finally {
        client.release();
    }
}

export default async function LocationsPage() {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    const locations = await getLocationsWithInventory(orgId);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold" style={{ color: 'var(--accent)' }}>Locations</h1>
                <Link href="/locations/new" className="btn btn-primary">
                    + Add Location
                </Link>
            </div>

            {locations.length === 0 ? (
                <div className="glass-card text-center py-12">
                    <p className="mb-4" style={{ color: 'var(--text-dim)' }}>No locations yet</p>
                    <Link href="/locations/new" className="btn btn-primary">
                        Create Your First Location
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {locations.map((loc: any) => (
                        <LocationCard key={loc.id} location={loc} />
                    ))}
                </div>
            )}
        </div>
    );
}
