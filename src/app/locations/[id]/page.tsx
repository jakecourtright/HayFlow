import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, Tractor, ShoppingCart, Banknote, Wrench, Package, ArrowLeftRight } from "lucide-react";
import { balesToTons, resolveWeight } from "@/lib/units";
import { getPermissionFlags } from "@/lib/permissions";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

async function getLocationWithInventory(locationId: string, orgId: string) {
    const client = await pool.connect();
    try {
        const locationResult = await client.query(
            'SELECT * FROM locations WHERE id = $1 AND org_id = $2',
            [locationId, orgId]
        );
        if (locationResult.rows.length === 0) return null;

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
                        WHEN t.type IN ('production', 'purchase', 'transfer_in') THEN t.amount
                        WHEN t.type IN ('sale', 'transfer_out') THEN -t.amount
                        ELSE 0
                    END
                ), 0) as current_stock
            FROM stacks s
            LEFT JOIN transactions t ON t.stack_id = s.id AND t.location_id = $1
            WHERE s.org_id = $2
            GROUP BY s.id, s.name, s.commodity, s.quality, s.weight_per_bale, s.bale_size
            HAVING COALESCE(SUM(
                CASE
                    WHEN t.type IN ('production', 'purchase', 'transfer_in') THEN t.amount
                    WHEN t.type IN ('sale', 'transfer_out') THEN -t.amount
                    ELSE 0
                END
            ), 0) != 0
            ORDER BY s.name ASC
        `, [locationId, orgId]);

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
        case 'transfer_out':
        case 'transfer_in': return <ArrowLeftRight size={16} />;
        default: return <Wrench size={16} />;
    }
}

function getTransactionLabel(type: string) {
    switch (type) {
        case 'production': return 'Baled';
        case 'purchase': return 'Purchased';
        case 'sale': return 'Sold';
        case 'transfer_out': return 'Transferred out';
        case 'transfer_in': return 'Transferred in';
        default: return 'Adjusted';
    }
}

export default async function LocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    const { id } = await params;
    const location = await getLocationWithInventory(id, orgId);
    if (!location) notFound();

    const { canManageTickets } = await getPermissionFlags();

    const totalStock = location.stacks.reduce((sum: number, s: any) => sum + parseFloat(s.current_stock), 0);
    const percentUsed = location.capacity > 0
        ? Math.min(100, Math.round((totalStock / location.capacity) * 100))
        : 0;
    const isNearCapacity = percentUsed > 90;

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Location"
                title={location.name}
                subtitle={`${totalStock.toLocaleString()} / ${location.capacity.toLocaleString()} ${location.unit} stored`}
                backHref="/locations"
                backLabel="Locations"
                actions={
                    <div className="flex items-center gap-2">
                        {canManageTickets && totalStock > 0 && (
                            <Link href={`/transfer?source=${location.id}`} className="btn btn-secondary btn-sm">
                                <ArrowLeftRight size={16} />
                                <span>Move bales</span>
                            </Link>
                        )}
                        <Link
                            href={`/locations/${location.id}/edit`}
                            aria-label="Edit location"
                            className="icon-button"
                        >
                            <Pencil size={16} />
                        </Link>
                    </div>
                }
            />

            <div className="glass-card">
                <div className="flex justify-between items-baseline mb-2">
                    <span className="text-eyebrow">Capacity used</span>
                    <span
                        className="text-sm font-bold tabular-nums"
                        style={{ color: isNearCapacity ? 'var(--error)' : 'var(--accent)' }}
                    >
                        {percentUsed}%
                    </span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                    <div
                        className="h-full rounded-full transition-all"
                        style={{
                            width: `${percentUsed}%`,
                            background: isNearCapacity ? 'var(--error)' : 'var(--primary)',
                        }}
                    />
                </div>
                {isNearCapacity && (
                    <p className="mt-2 text-xs" style={{ color: 'var(--error)' }}>
                        Near capacity —{' '}
                        {canManageTickets ? (
                            <Link href={`/transfer?source=${location.id}`} className="underline font-semibold">
                                move bales to another barn
                            </Link>
                        ) : (
                            'consider a transfer to another barn'
                        )}.
                    </p>
                )}
            </div>

            <section>
                <h2 className="text-eyebrow mb-3">Products stored here</h2>
                {location.stacks.length === 0 ? (
                    <EmptyState
                        icon={<Package className="w-7 h-7" />}
                        title="Nothing stored here"
                        body="Record production or a purchase into this location, or transfer bales in from another barn."
                    />
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
                                    className="glass-card glass-card-link p-4 flex justify-between items-center gap-3"
                                >
                                    <div className="min-w-0">
                                        <h3 className="font-semibold truncate" style={{ color: 'var(--accent)' }}>
                                            {stack.name}
                                        </h3>
                                        <span className="text-eyebrow">{stack.commodity}</span>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <div className="flex items-baseline gap-1 justify-end">
                                            <span className="text-lg font-bold" style={{ color: 'var(--primary-light)' }}>
                                                {stock.toLocaleString()}
                                            </span>
                                            <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                                bales
                                            </span>
                                        </div>
                                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                            {tons.toFixed(2)} tons
                                        </p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </section>

            <section>
                <h2 className="text-eyebrow mb-3">Recent transactions</h2>
                {location.transactions.length === 0 ? (
                    <EmptyState
                        icon={<Tractor className="w-7 h-7" />}
                        title="No activity yet"
                        body="Production, purchases, sales and transfers touching this location will show up here."
                    />
                ) : (
                    <div className="space-y-2">
                        {location.transactions.map((tx: any) => {
                            const isSale = tx.type === 'sale';
                            const isOutflow = isSale || tx.type === 'transfer_out';
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
                                                    <p className="font-semibold truncate" style={{ color: 'var(--accent)' }}>
                                                        {getTransactionLabel(tx.type)}
                                                        {tx.stack_name ? ` · ${tx.stack_name}` : ''}
                                                    </p>
                                                    <p className="text-xs truncate" style={{ color: 'var(--text-dim)' }}>
                                                        {tx.commodity}
                                                        {tx.entity ? ` · ${tx.entity}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p
                                                    className="font-bold text-lg tabular-nums"
                                                    style={{ color: isSale ? 'var(--error)' : 'var(--primary-light)' }}
                                                >
                                                    {isOutflow ? '−' : '+'}
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
