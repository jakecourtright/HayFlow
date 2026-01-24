import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";

// Define the type for the params
type Props = {
    params: Promise<{ id: string }>;
};

async function getLocationDetails(orgId: string, locationId: string) {
    const client = await pool.connect();
    try {
        const locRes = await client.query('SELECT * FROM locations WHERE id = $1 AND org_id = $2', [locationId, orgId]);
        const location = locRes.rows[0];

        if (!location) return null;

        // Get stacks currently in this location
        // We need to calculate the stock of each stack in this location
        // We get all transactions for this location and sum them up by stack_id
        const inventoryRes = await client.query(`
      SELECT 
        s.id, s.name, s.commodity, s.quality,
        COALESCE(SUM(CASE WHEN t.type IN ('production', 'purchase') THEN t.amount ELSE -t.amount END), 0) as current_stock
      FROM transactions t
      JOIN stacks s ON t.stack_id = s.id
      WHERE t.location_id = $1 AND t.org_id = $2
      GROUP BY s.id, s.name, s.commodity, s.quality
      HAVING COALESCE(SUM(CASE WHEN t.type IN ('production', 'purchase') THEN t.amount ELSE -t.amount END), 0) > 0
    `, [locationId, orgId]);

        return {
            location,
            inventory: inventoryRes.rows
        };
    } finally {
        client.release();
    }
}

export default async function LocationPage({ params }: Props) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    const { id } = await params;
    const data = await getLocationDetails(orgId, id);

    if (!data) {
        return <div className="text-center py-10">Location not found</div>;
    }

    const { location, inventory } = data;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/inventory" className="btn-secondary p-2 rounded-xl">
                    ←
                </Link>
                <div>
                    <h1 className="text-xl font-bold">{location.name}</h1>
                    <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Location Details</span>
                </div>
            </div>

            <div className="space-y-4">
                {inventory.length === 0 ? (
                    <div className="glass-card text-center py-10 text-slate-500">
                        No inventory currently stored here.
                    </div>
                ) : (
                    inventory.map((item: any) => (
                        <div key={item.id} className="glass-card">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="text-lg font-bold text-white">{item.name}</h3>
                                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{item.commodity}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                                    <span className="block text-[10px] uppercase text-slate-500 font-bold">Stock Here</span>
                                    <span className="text-lg font-bold text-white">{parseFloat(item.current_stock).toLocaleString()}</span>
                                </div>
                                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                                    <span className="block text-[10px] uppercase text-slate-500 font-bold">Quality</span>
                                    <span className="text-lg font-bold text-white">{item.quality}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
