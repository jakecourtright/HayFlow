import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Tractor, ShoppingCart, Banknote, Wrench } from "lucide-react";
import { balesToTons, resolveWeight } from "@/lib/units";

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
                s.weight_per_bale,
                s.bale_size,
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
            GROUP BY s.id, s.name, s.commodity, s.quality, s.weight_per_bale, s.bale_size
            HAVING COALESCE(SUM(
                CASE 
                    WHEN t.type IN ('production', 'purchase') THEN t.amount
                    WHEN t.type = 'sale' THEN -t.amount
                    ELSE 0
                END
            ), 0) != 0
            ORDER BY s.name ASC
        `, [locationId, orgId]);

        // Get recent transactions for this location
        const transactionsResult = await client.query(`
            SELECT 
                t.*,
                s.name as stack_name,
                s.commodity
            FROM transactions t
            LEFT JOIN stacks s ON s.id = t.stack_id
            WHERE t.location_id = $1 AND t.org_id = $2
            ORDER BY t.date DESC
            LIMIT 20
        `, [locationId, orgId]);

        return {
            ...location,
            stacks: inventoryResult.rows,
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/locations"
                    className="p-2 rounded-xl transition-colors"
                    style={{ background: 'var(--bg-surface)' }}
                >
                    <ArrowLeft size={20} style={{ color: 'var(--text-dim)' }} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{location.name}</h1>
                    <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                        {totalStock.toLocaleString()} / {location.capacity.toLocaleString()} {location.unit} ({percentUsed}% full)
                    </p>
                </div>
                <Link
                    href={`/locations/${location.id}/edit`}
                    className="p-2 rounded-xl transition-colors"
                    style={{ background: 'var(--bg-surface)' }}
                >
                    <Pencil size={18} style={{ color: 'var(--text-dim)' }} />
                </Link>
            </div>

            {/* Capacity Bar */}
            <div className="glass-card">
                <div className="flex justify-between mb-2">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-dim)' }}>Capacity Used</span>
                    <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{percentUsed}%</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                    <div
                        className="h-full rounded-full transition-all"
                        style={{
                            width: `${percentUsed}%`,
                            background: percentUsed > 90 ? '#ef4444' : 'var(--primary)'
                        }}
                    />
                </div>
            </div>

            {/* Stacks at this Location */}
            <div>
                <h2 className="text-sm font-bold mb-3 uppercase" style={{ color: 'var(--text-dim)' }}>
                    Products at this Location
                </h2>
                {location.stacks.length === 0 ? (
                    <div className="glass-card text-center py-8" style={{ color: 'var(--text-dim)' }}>
                        No stacks currently stored here
                    </div>
                ) : (
                    <div className="space-y-2">
                        {location.stacks.map((stack: any) => {
                            const stock = parseFloat(stack.current_stock);
                            const weight = resolveWeight(stack.weight_per_bale, stack.bale_size);
                            const tons = balesToTons(stock, weight);
                            return (
                                <Link
                                    key={stack.id}
                                    href={`/stacks/${stack.id}`}
                                    className="glass-card p-4 flex justify-between items-center hover:brightness-110 transition-all"
                                >
                                    <div>
                                        <h3 className="font-semibold" style={{ color: 'var(--accent)' }}>{stack.name}</h3>
                                        <span className="text-xs font-semibold uppercase" style={{ color: 'var(--primary-light)' }}>
                                            {stack.commodity}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-lg font-bold" style={{ color: 'var(--primary-light)' }}>
                                            {stock.toLocaleString()}
                                        </span>
                                        <span className="text-xs ml-1" style={{ color: 'var(--text-dim)' }}>bales</span>
                                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                            {tons.toFixed(2)} tons
                                        </p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Transaction History */}
            <div>
                <h2 className="text-sm font-bold mb-3 uppercase" style={{ color: 'var(--text-dim)' }}>
                    Recent Transactions
                </h2>
                {location.transactions.length === 0 ? (
                    <div className="glass-card text-center py-8" style={{ color: 'var(--text-dim)' }}>
                        No transactions yet
                    </div>
                ) : (
                    <div className="space-y-2">
                        {location.transactions.map((tx: any) => (
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
                                                {getTransactionLabel(tx.type)}: {tx.stack_name || 'Unknown'}
                                            </p>
                                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                                {tx.commodity} {tx.entity && `• ${tx.entity}`}
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
