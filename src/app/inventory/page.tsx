import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";

async function getLocationsWithInventory(orgId: string) {
    const client = await pool.connect();
    try {
        // Get all locations for user
        const locRes = await client.query('SELECT * FROM locations WHERE org_id = $1 ORDER BY name ASC', [orgId]);
        const locations = locRes.rows;

        // Get inventory counts per location
        // We sum up transactions by location
        const inventoryRes = await client.query(`
      SELECT 
        location_id, 
        COUNT(DISTINCT stack_id) as stack_count,
        SUM(CASE WHEN type IN ('production', 'purchase') THEN amount ELSE -amount END) as current_stock
      FROM transactions 
      WHERE org_id = $1 AND location_id IS NOT NULL
      GROUP BY location_id
    `, [orgId]);

        const inventoryMap = new Map();
        inventoryRes.rows.forEach((row: any) => {
            inventoryMap.set(row.location_id, {
                stackCount: parseInt(row.stack_count),
                currentStock: parseFloat(row.current_stock)
            });
        });

        return locations.map((loc: any) => {
            const stats = inventoryMap.get(loc.id) || { stackCount: 0, currentStock: 0 };
            return {
                ...loc,
                ...stats,
                percentUsed: loc.capacity > 0 ? Math.round((stats.currentStock / loc.capacity) * 100) : 0
            };
        });
    } finally {
        client.release();
    }
}

export default async function InventoryPage() {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    const locations = await getLocationsWithInventory(orgId);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold">Inventory Locations</h1>
                <Link href="/inventory/new" className="text-xs font-semibold px-3 py-2 bg-slate-800 rounded-lg border border-white/10 hover:bg-slate-700">
                    + Add Location
                </Link>
            </div>

            <div className="space-y-4">
                {locations.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                        No locations found. Add one to get started.
                    </div>
                ) : (
                    locations.map((loc: any) => (
                        <Link href={`/inventory/${loc.id}`} key={loc.id} className="glass-card block transition-transform hover:scale-[1.02]">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="text-lg font-bold">{loc.name}</h3>
                                    <span className="text-xs text-slate-500">
                                        {loc.currentStock.toLocaleString()} / {loc.capacity.toLocaleString()} {loc.unit || 'bales'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`font-bold ${loc.percentUsed > 90 ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {loc.percentUsed}%
                                    </span>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(loc.percentUsed, 100)}%` }}
                                />
                            </div>

                            <div className="mt-3 text-xs text-slate-500">
                                {loc.stackCount} Lots stored here
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
