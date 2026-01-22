import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import LocationCard from "./LocationCard";

async function getLocationsWithInventory(userId: string) {
    const client = await pool.connect();
    try {
        const locations = await client.query(
            'SELECT * FROM locations WHERE user_id = $1 ORDER BY name ASC',
            [userId]
        );

        const inventoryQuery = await client.query(`
            SELECT 
                t.location_id,
                COALESCE(SUM(
                    CASE 
                        WHEN t.type IN ('production', 'purchase') THEN t.amount
                        WHEN t.type = 'sale' THEN -t.amount
                        ELSE 0
                    END
                ), 0) as total_stock,
                COUNT(DISTINCT t.stack_id) as stack_count
            FROM transactions t
            WHERE t.user_id = $1 AND t.location_id IS NOT NULL
            GROUP BY t.location_id
        `, [userId]);

        const inventoryMap: Record<string, { total_stock: number; stack_count: number }> = {};
        inventoryQuery.rows.forEach((row: any) => {
            inventoryMap[row.location_id] = {
                total_stock: parseFloat(row.total_stock) || 0,
                stack_count: parseInt(row.stack_count) || 0
            };
        });

        return locations.rows.map((loc: any) => ({
            ...loc,
            total_stock: inventoryMap[loc.id]?.total_stock || 0,
            stack_count: inventoryMap[loc.id]?.stack_count || 0
        }));
    } finally {
        client.release();
    }
}

export default async function LocationsPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/api/auth/signin");

    const locations = await getLocationsWithInventory(session.user.id);

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
