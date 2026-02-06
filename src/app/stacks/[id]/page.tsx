import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Tractor, ShoppingCart, Banknote, Wrench } from "lucide-react";

async function getStackWithDetails(stackId: string, orgId: string) {
    const client = await pool.connect();
    try {
        // Get stack info
        const stackResult = await client.query(
            'SELECT * FROM stacks WHERE id = $1 AND org_id = $2',
            [stackId, orgId]
        );

        if (stackResult.rows.length === 0) {
            return null;
        }

        const stack = stackResult.rows[0];

        // Get inventory by location
        const locationInventory = await client.query(`
            SELECT 
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
            WHERE t.stack_id = $1 AND t.org_id = $2 AND t.location_id IS NOT NULL
            GROUP BY l.id, l.name
            HAVING COALESCE(SUM(
                CASE 
                    WHEN t.type IN ('production', 'purchase') THEN t.amount
                    WHEN t.type = 'sale' THEN -t.amount
                    ELSE 0
                END
            ), 0) != 0
            ORDER BY l.name ASC
        `, [stackId, orgId]);

        // Get total stock
        const totalResult = await client.query(`
            SELECT COALESCE(SUM(
                CASE 
                    WHEN type IN ('production', 'purchase') THEN amount
                    WHEN type = 'sale' THEN -amount
                    ELSE 0
                END
            ), 0) as total
            FROM transactions
            WHERE stack_id = $1 AND org_id = $2
        `, [stackId, orgId]);

        // Get recent transactions
        const transactionsResult = await client.query(`
            SELECT 
                t.*,
                l.name as location_name
            FROM transactions t
            LEFT JOIN locations l ON l.id = t.location_id
            WHERE t.stack_id = $1 AND t.org_id = $2
            ORDER BY t.date DESC
            LIMIT 20
        `, [stackId, orgId]);

        return {
            ...stack,
            total_stock: parseFloat(totalResult.rows[0].total),
            locations: locationInventory.rows.map((r: any) => ({
                ...r,
                stock: parseFloat(r.stock)
            })),
            transactions: transactionsResult.rows
        };
    } finally {
        client.release();
    }
}

function getTransactionIcon(type: string) {
    switch (type) {
        case 'production': return <Tractor size={16} />;
        case 'purchase': return <ShoppingCart size={16} />;
        case 'sale': return <Banknote size={16} />;
        default: return <Wrench size={16} />;
    }
}

function getTransactionLabel(type: string) {
    switch (type) {
        case 'production': return 'Baled';
        case 'purchase': return 'Purchased';
        case 'sale': return 'Sold';
        default: return 'Adjusted';
    }
}

export default async function StackDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    const { id } = await params;
    const stack = await getStackWithDetails(id, orgId);

    if (!stack) {
        notFound();
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/stacks"
                    className="p-2 rounded-xl transition-colors"
                    style={{ background: 'var(--bg-surface)' }}
                >
                    <ArrowLeft size={20} style={{ color: 'var(--text-dim)' }} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{stack.name}</h1>
                    <p className="text-sm font-semibold uppercase" style={{ color: 'var(--primary-light)' }}>
                        {stack.commodity}
                    </p>
                </div>
                <Link
                    href={`/stacks/${stack.id}/edit`}
                    className="p-2 rounded-xl transition-colors"
                    style={{ background: 'var(--bg-surface)' }}
                >
                    <Pencil size={18} style={{ color: 'var(--text-dim)' }} />
                </Link>
            </div>

            {/* Stats Card */}
            <div className="glass-card">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <span className="text-xs block" style={{ color: 'var(--text-dim)' }}>TOTAL INVENTORY</span>
                        <span className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                            {stack.total_stock.toLocaleString()}
                        </span>
                        <span className="text-sm ml-1" style={{ color: 'var(--text-dim)' }}>Bales</span>
                    </div>
                    <div>
                        <span className="text-xs block" style={{ color: 'var(--text-dim)' }}>BASE PRICE</span>
                        <span className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                            ${parseFloat(stack.base_price).toFixed(2)}
                        </span>
                        <span className="text-sm ml-1" style={{ color: 'var(--text-dim)' }}>/unit</span>
                    </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 text-xs mt-4 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
                    <span className="px-2 py-1 rounded" style={{ background: 'var(--bg-surface)', color: 'var(--text-dim)' }}>
                        {stack.quality || 'N/A'}
                    </span>
                    <span className="px-2 py-1 rounded" style={{ background: 'var(--bg-surface)', color: 'var(--text-dim)' }}>
                        {stack.bale_size || 'N/A'}
                    </span>
                </div>
            </div>

            {/* Location Breakdown */}
            {stack.locations.length > 0 && (
                <div>
                    <h2 className="text-sm font-bold mb-3 uppercase" style={{ color: 'var(--text-dim)' }}>
                        Inventory by Location
                    </h2>
                    <div className="space-y-2">
                        {stack.locations.map((loc: any) => (
                            <Link
                                key={loc.location_id}
                                href={`/locations/${loc.location_id}`}
                                className="glass-card p-4 flex justify-between items-center hover:brightness-110 transition-all"
                            >
                                <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                                    {loc.location_name}
                                </span>
                                <span className="text-lg font-bold" style={{ color: 'var(--primary-light)' }}>
                                    {loc.stock.toLocaleString()} <span className="text-xs font-normal" style={{ color: 'var(--text-dim)' }}>bales</span>
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Transaction History */}
            <div>
                <h2 className="text-sm font-bold mb-3 uppercase" style={{ color: 'var(--text-dim)' }}>
                    Recent Transactions
                </h2>
                {stack.transactions.length === 0 ? (
                    <div className="glass-card text-center py-8" style={{ color: 'var(--text-dim)' }}>
                        No transactions yet
                    </div>
                ) : (
                    <div className="space-y-2">
                        {stack.transactions.map((tx: any) => (
                            <div key={tx.id} className="glass-card p-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="p-2 rounded-lg"
                                            style={{
                                                background: tx.type === 'sale' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(var(--primary-rgb), 0.2)',
                                                color: tx.type === 'sale' ? '#ef4444' : 'var(--primary-light)'
                                            }}
                                        >
                                            {getTransactionIcon(tx.type)}
                                        </div>
                                        <div>
                                            <p className="font-semibold" style={{ color: 'var(--accent)' }}>
                                                {getTransactionLabel(tx.type)}
                                            </p>
                                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                                {tx.location_name || 'No location'} {tx.entity && `• ${tx.entity}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p
                                            className="font-bold text-lg"
                                            style={{ color: tx.type === 'sale' ? '#ef4444' : 'var(--primary-light)' }}
                                        >
                                            {tx.type === 'sale' ? '−' : '+'}{parseFloat(tx.amount).toLocaleString()}
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                            {new Date(tx.date).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
