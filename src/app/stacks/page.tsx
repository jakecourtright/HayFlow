import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Pencil } from "lucide-react";
import StackActions from "./StackActions";
import { balesToTons, resolveWeight } from "@/lib/units";

async function getStacksWithInventory(orgId: string) {
    const client = await pool.connect();
    try {
        const stacksResult = await client.query(`
            SELECT 
                s.*,
                COALESCE(SUM(
                    CASE 
                        WHEN t.type IN ('production', 'purchase') THEN t.amount
                        WHEN t.type = 'sale' THEN -t.amount
                        ELSE 0
                    END
                ), 0) as current_stock
            FROM stacks s
            LEFT JOIN transactions t ON t.stack_id = s.id
            WHERE s.org_id = $1
            GROUP BY s.id
            ORDER BY s.created_at DESC
        `, [orgId]);

        const breakdownResult = await client.query(`
            SELECT 
                t.stack_id,
                l.id as location_id,
                l.name as location_name,
                COALESCE(SUM(
                    CASE 
                        WHEN t.type IN ('production', 'purchase') THEN t.amount
                        WHEN t.type = 'sale' THEN -t.amount
                        ELSE 0
                    END
                ), 0) as stock
            FROM transactions t
            JOIN locations l ON l.id = t.location_id
            WHERE t.org_id = $1 AND t.location_id IS NOT NULL
            GROUP BY t.stack_id, l.id, l.name
            HAVING COALESCE(SUM(
                CASE 
                    WHEN t.type IN ('production', 'purchase') THEN t.amount
                    WHEN t.type = 'sale' THEN -t.amount
                    ELSE 0
                END
            ), 0) != 0
        `, [orgId]);

        const breakdownMap: Record<number, Array<{ location_name: string; stock: number }>> = {};
        breakdownResult.rows.forEach((row: any) => {
            if (!breakdownMap[row.stack_id]) {
                breakdownMap[row.stack_id] = [];
            }
            breakdownMap[row.stack_id].push({
                location_name: row.location_name,
                stock: parseFloat(row.stock)
            });
        });

        return stacksResult.rows.map((stack: any) => ({
            ...stack,
            current_stock: parseFloat(stack.current_stock),
            location_breakdown: breakdownMap[stack.id] || []
        }));
    } finally {
        client.release();
    }
}

export default async function StacksPage() {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    const stacks = await getStacksWithInventory(orgId);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold" style={{ color: 'var(--accent)' }}>Product Definitions (Stacks)</h1>
                <Link href="/stacks/new" className="btn btn-primary">
                    + New Stack
                </Link>
            </div>

            <div className="grid gap-4">
                {stacks.length === 0 ? (
                    <div className="glass-card text-center py-12">
                        <p className="mb-4" style={{ color: 'var(--text-dim)' }}>No stacks defined yet</p>
                        <Link href="/stacks/new" className="btn btn-primary">
                            Create Your First Stack
                        </Link>
                    </div>
                ) : (
                    stacks.map((stack: any) => (
                        <div key={stack.id} className="glass-card">
                            <div className="flex justify-between items-start">
                                <Link href={`/stacks/${stack.id}`} className="flex-1 hover:opacity-80 transition-opacity">
                                    <h3 className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{stack.name}</h3>
                                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--primary-light)' }}>
                                        {stack.commodity}
                                    </span>
                                </Link>
                                <div className="flex gap-2">
                                    <Link
                                        href={`/stacks/${stack.id}/edit`}
                                        className="p-2 rounded-lg transition-colors"
                                        style={{ background: 'var(--bg-surface)' }}
                                    >
                                        <Pencil size={14} style={{ color: 'var(--text-dim)' }} />
                                    </Link>
                                    <StackActions stackId={stack.id} />
                                </div>
                            </div>

                            {/* Total Inventory */}
                            {(() => {
                                const weight = resolveWeight(stack.weight_per_bale, stack.bale_size);
                                const tons = balesToTons(stack.current_stock, weight);
                                return (
                                    <div className="mt-4 mb-3">
                                        <span className="text-xs block" style={{ color: 'var(--text-dim)' }}>TOTAL INVENTORY</span>
                                        <span className="text-xl font-semibold" style={{ color: 'var(--accent)' }}>
                                            {stack.current_stock.toLocaleString()} Bales
                                        </span>
                                        <span className="text-sm ml-2" style={{ color: 'var(--text-dim)' }}>
                                            ({tons.toFixed(2)} tons)
                                        </span>
                                    </div>
                                );
                            })()}

                            {/* Location Breakdown */}
                            {stack.location_breakdown.length > 0 && (
                                <div className="p-3 rounded-lg mb-4 text-sm" style={{ background: 'var(--bg-surface)' }}>
                                    <div className="font-semibold text-xs mb-2 pb-1" style={{ color: 'var(--text-dim)', borderBottom: '1px solid var(--glass-border)' }}>
                                        LOCATION BREAKDOWN
                                    </div>
                                    {stack.location_breakdown.map((loc: any, idx: number) => (
                                        <div key={idx} className="flex justify-between py-1">
                                            <span style={{ color: 'var(--text-dim)' }}>{loc.location_name}:</span>
                                            <span className="font-semibold" style={{ color: 'var(--accent)' }}>{loc.stock.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Badges */}
                            <div className="flex flex-wrap gap-2 text-xs pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
                                <span className="px-2 py-1 rounded" style={{ background: 'var(--bg-surface)', color: 'var(--text-dim)' }}>
                                    {stack.quality}
                                </span>
                                <span className="px-2 py-1 rounded" style={{ background: 'var(--bg-surface)', color: 'var(--text-dim)' }}>
                                    {stack.bale_size} {stack.weight_per_bale && `(${stack.weight_per_bale} lbs)`}
                                </span>
                                <span className="px-2 py-1 rounded" style={{ background: 'var(--bg-surface)', color: 'var(--text-dim)' }}>
                                    ${parseFloat(stack.base_price).toFixed(2)}/{stack.price_unit || 'bale'}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
