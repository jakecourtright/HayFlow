import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, Tractor, ShoppingCart, Banknote, Wrench, MapPin } from "lucide-react";
import { balesToTons, resolveWeight } from "@/lib/units";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

async function getStackWithDetails(stackId: string, orgId: string) {
    const client = await pool.connect();
    try {
        const stackResult = await client.query(
            'SELECT * FROM stacks WHERE id = $1 AND org_id = $2',
            [stackId, orgId]
        );
        if (stackResult.rows.length === 0) return null;
        const stack = stackResult.rows[0];

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
            locations: locationInventory.rows.map((r: any) => ({ ...r, stock: parseFloat(r.stock) })),
            transactions: transactionsResult.rows,
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
    if (!stack) notFound();

    const weight = resolveWeight(stack.weight_per_bale, stack.bale_size);
    const tons = balesToTons(stack.total_stock, weight);

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow={stack.commodity}
                title={stack.name}
                backHref="/stacks"
                backLabel="Stacks"
                actions={
                    <Link href={`/stacks/${stack.id}/edit`} aria-label="Edit stack" className="icon-button">
                        <Pencil size={16} />
                    </Link>
                }
            />

            <div className="glass-card">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <span className="text-eyebrow">Total inventory</span>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>
                                {stack.total_stock.toLocaleString()}
                            </span>
                            <span className="text-sm" style={{ color: 'var(--text-dim)' }}>bales</span>
                        </div>
                        <p className="text-sm mt-0.5" style={{ color: 'var(--text-dim)' }}>
                            {tons.toFixed(2)} tons
                        </p>
                    </div>
                    <div>
                        <span className="text-eyebrow">Base price</span>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>
                                ${parseFloat(stack.base_price).toFixed(2)}
                            </span>
                            <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
                                /{stack.price_unit || 'bale'}
                            </span>
                        </div>
                    </div>
                </div>

                <div
                    className="grid grid-cols-3 gap-4 mt-5 pt-5 text-sm"
                    style={{ borderTop: '1px solid var(--glass-border)' }}
                >
                    <div>
                        <span className="text-eyebrow">Weight/bale</span>
                        <p style={{ color: 'var(--accent)' }}>{weight.toLocaleString()} lbs</p>
                    </div>
                    <div>
                        <span className="text-eyebrow">Bale size</span>
                        <p style={{ color: 'var(--accent)' }}>{stack.bale_size || 'N/A'}</p>
                    </div>
                    <div>
                        <span className="text-eyebrow">Quality</span>
                        <p style={{ color: 'var(--accent)' }}>{stack.quality || 'N/A'}</p>
                    </div>
                </div>
            </div>

            {stack.locations.length > 0 && (
                <section>
                    <h2 className="text-eyebrow mb-3 flex items-center gap-1.5">
                        <MapPin size={12} />
                        <span>Inventory by location</span>
                    </h2>
                    <div className="space-y-2">
                        {stack.locations.map((loc: any) => (
                            <Link
                                key={loc.location_id}
                                href={`/locations/${loc.location_id}`}
                                className="glass-card glass-card-link p-4 flex justify-between items-center"
                            >
                                <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                                    {loc.location_name}
                                </span>
                                <span className="text-lg font-bold" style={{ color: 'var(--primary-light)' }}>
                                    {loc.stock.toLocaleString()}{' '}
                                    <span className="text-xs font-normal" style={{ color: 'var(--text-dim)' }}>
                                        bales
                                    </span>
                                </span>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            <section>
                <h2 className="text-eyebrow mb-3">Recent transactions</h2>
                {stack.transactions.length === 0 ? (
                    <EmptyState
                        icon={<Tractor className="w-7 h-7" />}
                        title="No activity yet"
                        body="Production, purchases, sales and transfers on this stack will appear here."
                    />
                ) : (
                    <div className="space-y-2">
                        {stack.transactions.map((tx: any) => {
                            const isSale = tx.type === 'sale';
                            return (
                                <Link key={tx.id} href={`/transactions/${tx.id}`} className="block">
                                    <div className="glass-card glass-card-link p-4">
                                        <div className="flex justify-between items-center gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div
                                                    className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                                                    style={{
                                                        background: isSale
                                                            ? 'color-mix(in srgb, var(--error) 10%, transparent)'
                                                            : 'color-mix(in srgb, var(--primary) 10%, transparent)',
                                                        color: isSale ? 'var(--error)' : 'var(--primary)',
                                                    }}
                                                >
                                                    {getTransactionIcon(tx.type)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold" style={{ color: 'var(--accent)' }}>
                                                        {getTransactionLabel(tx.type)}
                                                    </p>
                                                    <p className="text-xs truncate" style={{ color: 'var(--text-dim)' }}>
                                                        {tx.location_name || 'No location'}
                                                        {tx.entity ? ` · ${tx.entity}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p
                                                    className="font-bold text-lg tabular-nums"
                                                    style={{ color: isSale ? 'var(--error)' : 'var(--primary-light)' }}
                                                >
                                                    {isSale ? '−' : '+'}
                                                    {parseFloat(tx.amount).toLocaleString()}
                                                </p>
                                                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                                    {new Date(tx.date).toLocaleDateString(undefined, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
