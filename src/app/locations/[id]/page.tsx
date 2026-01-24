import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

async function getLocationWithInventory(locationId: string, orgId: string) {
    const client = await pool.connect();
    try {
        const locationResult = await client.query(
            'SELECT * FROM locations WHERE id = $1 AND org_id = $2',
            [locationId, orgId]
        );

        if (locationResult.rows.length === 0) {
            return null;
        }

        const location = locationResult.rows[0];

        const inventoryResult = await client.query(`
            SELECT 
                s.id,
                s.name,
                s.commodity,
                s.quality,
                COALESCE(SUM(
                    CASE 
                        WHEN t.type IN ('production', 'purchase') THEN t.amount
                        WHEN t.type = 'sale' THEN -t.amount
                        ELSE 0
                    END
                ), 0) as current_stock
            FROM stacks s
            LEFT JOIN transactions t ON t.stack_id = s.id AND t.location_id = $1
            WHERE s.org_id = $2
            GROUP BY s.id, s.name, s.commodity, s.quality
            HAVING COALESCE(SUM(
                CASE 
                    WHEN t.type IN ('production', 'purchase') THEN t.amount
                    WHEN t.type = 'sale' THEN -t.amount
                    ELSE 0
                END
            ), 0) != 0
            ORDER BY s.name ASC
        `, [locationId, orgId]);

        return {
            ...location,
            stacks: inventoryResult.rows
        };
    } finally {
        client.release();
    }
}

export default async function LocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    const { id } = await params;
    const location = await getLocationWithInventory(id, orgId);

    if (!location) {
        notFound();
    }

    const totalStock = location.stacks.reduce((sum: number, s: any) => sum + parseFloat(s.current_stock), 0);
    const percentUsed = Math.min(100, Math.round((totalStock / location.capacity) * 100));

    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/locations"
                    className="p-2 rounded-xl transition-colors"
                    style={{ background: 'var(--bg-surface)' }}
                >
                    <ArrowLeft size={20} style={{ color: 'var(--text-dim)' }} />
                </Link>
                <div>
                    <h1 className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{location.name}</h1>
                    <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                        {totalStock.toLocaleString()} / {location.capacity.toLocaleString()} {location.unit} ({percentUsed}% full)
                    </p>
                </div>
            </div>

            {location.stacks.length === 0 ? (
                <div className="glass-card text-center py-12">
                    <p style={{ color: 'var(--text-dim)' }}>No stacks currently stored at this location</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {location.stacks.map((stack: any) => (
                        <div key={stack.id} className="glass-card p-5">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="text-lg font-semibold" style={{ color: 'var(--accent)' }}>{stack.name}</h3>
                                    <span className="text-sm font-semibold uppercase" style={{ color: 'var(--primary-light)' }}>
                                        {stack.commodity}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                    <span className="text-xs block" style={{ color: 'var(--text-dim)' }}>STOCK HERE</span>
                                    <span className="text-lg font-semibold" style={{ color: 'var(--accent)' }}>
                                        {parseFloat(stack.current_stock).toLocaleString()} Bales
                                    </span>
                                </div>
                                <div>
                                    <span className="text-xs block" style={{ color: 'var(--text-dim)' }}>QUALITY</span>
                                    <span className="text-lg font-semibold" style={{ color: 'var(--accent)' }}>{stack.quality || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
