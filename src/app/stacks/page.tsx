import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Pencil, Plus, Package } from "lucide-react";
import StackActions from "./StackActions";
import { balesToTons, resolveWeight } from "@/lib/units";
import { getPermissionFlags } from "@/lib/permissions";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

async function getStacksWithInventory(orgId: string) {
    const client = await pool.connect();
    try {
        const stacksResult = await client.query(`
            SELECT
                s.*,
                COALESCE(SUM(
                    CASE
                        WHEN t.type IN ('production', 'purchase', 'transfer_in', 'adjustment') THEN t.amount
                        WHEN t.type IN ('sale', 'transfer_out') THEN -t.amount
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
                        WHEN t.type IN ('production', 'purchase', 'transfer_in', 'adjustment') THEN t.amount
                        WHEN t.type IN ('sale', 'transfer_out') THEN -t.amount
                        ELSE 0
                    END
                ), 0) as stock
            FROM transactions t
            JOIN locations l ON l.id = t.location_id
            WHERE t.org_id = $1 AND t.location_id IS NOT NULL
            GROUP BY t.stack_id, l.id, l.name
            HAVING COALESCE(SUM(
                CASE
                    WHEN t.type IN ('production', 'purchase', 'transfer_in', 'adjustment') THEN t.amount
                    WHEN t.type IN ('sale', 'transfer_out') THEN -t.amount
                    ELSE 0
                END
            ), 0) != 0
        `, [orgId]);

        const breakdownMap: Record<number, Array<{ location_name: string; stock: number }>> = {};
        breakdownResult.rows.forEach((row: any) => {
            if (!breakdownMap[row.stack_id]) breakdownMap[row.stack_id] = [];
            breakdownMap[row.stack_id].push({
                location_name: row.location_name,
                stock: parseFloat(row.stock),
            });
        });

        return stacksResult.rows.map((stack: any) => ({
            ...stack,
            current_stock: parseFloat(stack.current_stock),
            location_breakdown: breakdownMap[stack.id] || [],
        }));
    } finally {
        client.release();
    }
}

export default async function StacksPage() {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    const stacks = await getStacksWithInventory(orgId);
    const perms = await getPermissionFlags();

    const activeStacks = stacks.filter((s: any) => !s.archived_at);
    const archivedStacks = stacks.filter((s: any) => s.archived_at);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Stacks"
                subtitle="Every product you track — quality, bale size, and price-per-unit."
                actions={
                    perms.canWriteInventory ? (
                        <Link href="/stacks/new" className="btn btn-primary btn-sm">
                            <Plus size={16} />
                            <span className="hidden sm:inline">New stack</span>
                            <span className="sm:hidden">New</span>
                        </Link>
                    ) : null
                }
            />

            {stacks.length === 0 ? (
                <EmptyState
                    icon={<Package className="w-7 h-7" />}
                    title="No stacks yet"
                    body="Stacks are the products you sell — a cutting of alfalfa, a field of oat hay. Define one to start tracking inventory."
                    ctaHref={perms.canWriteInventory ? "/stacks/new" : undefined}
                    ctaLabel="Create your first stack"
                />
            ) : (
                <>
                {activeStacks.length === 0 ? (
                    <EmptyState
                        icon={<Package className="w-7 h-7" />}
                        title="No active stacks"
                        body="Every stack here is archived. Restore one below, or add a new stack."
                        ctaHref={perms.canWriteInventory ? "/stacks/new" : undefined}
                        ctaLabel="New stack"
                    />
                ) : (
                <div className="grid gap-4">
                    {activeStacks.map((stack: any) => {
                        const weight = resolveWeight(stack.weight_per_bale, stack.bale_size);
                        const tons = balesToTons(stack.current_stock, weight);
                        const isLow = stack.current_stock > 0 && stack.current_stock < 100;
                        const isEmpty = stack.current_stock <= 0;

                        return (
                            <div key={stack.id} className="glass-card">
                                <div className="flex justify-between items-start gap-3 mb-4">
                                    <Link
                                        href={`/stacks/${stack.id}`}
                                        className="flex-1 min-w-0 hover:opacity-80 transition-opacity"
                                    >
                                        <h3 className="text-display-sm truncate">{stack.name}</h3>
                                        <span className="text-eyebrow mt-0.5">{stack.commodity}</span>
                                    </Link>
                                    {perms.canWriteInventory && (
                                        <div className="flex gap-1 flex-shrink-0">
                                            <Link
                                                href={`/stacks/${stack.id}/edit`}
                                                aria-label="Edit stack"
                                                className="icon-button"
                                            >
                                                <Pencil size={14} />
                                            </Link>
                                            <StackActions stackId={stack.id} canDelete={perms.canDeleteStacks} />
                                        </div>
                                    )}
                                </div>

                                <div className="mb-3">
                                    <span className="text-eyebrow">Total inventory</span>
                                    <div className="flex items-baseline gap-2 mt-0.5">
                                        <span className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                                            {stack.current_stock.toLocaleString()}
                                        </span>
                                        <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
                                            bales · {tons.toFixed(2)} tons
                                        </span>
                                        {isEmpty && <span className="chip chip-sm chip-muted">Out</span>}
                                        {isLow && <span className="chip chip-sm chip-warning">Low</span>}
                                    </div>
                                </div>

                                {stack.location_breakdown.length > 0 && (
                                    <details className="group" open={stack.location_breakdown.length <= 3}>
                                        <summary className="cursor-pointer list-none text-eyebrow flex items-center gap-1 select-none py-1">
                                            <span>By location ({stack.location_breakdown.length})</span>
                                            <span className="opacity-40 group-open:rotate-90 transition-transform">›</span>
                                        </summary>
                                        <div
                                            className="mt-2 p-3 rounded-xl text-sm space-y-1"
                                            style={{ background: 'var(--bg-surface)' }}
                                        >
                                            {stack.location_breakdown.map((loc: any, idx: number) => (
                                                <div key={idx} className="flex justify-between">
                                                    <span style={{ color: 'var(--text-dim)' }}>{loc.location_name}</span>
                                                    <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                                                        {loc.stock.toLocaleString()} bales
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                )}

                                <div
                                    className="flex flex-wrap gap-2 text-xs pt-4 mt-3"
                                    style={{ borderTop: '1px solid var(--glass-border)' }}
                                >
                                    <span className="chip chip-sm chip-muted">{stack.quality}</span>
                                    <span className="chip chip-sm chip-muted">
                                        {stack.bale_size}
                                        {stack.weight_per_bale ? ` · ${stack.weight_per_bale} lbs` : ''}
                                    </span>
                                    {perms.canWriteInventory && (
                                        <span className="chip chip-sm chip-info">
                                            ${parseFloat(stack.base_price).toFixed(2)}/{stack.price_unit || 'bale'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                )}

                {archivedStacks.length > 0 && (
                    <details className="group">
                        <summary className="cursor-pointer list-none text-eyebrow flex items-center gap-1 select-none py-2">
                            <span>Archived ({archivedStacks.length})</span>
                            <span className="opacity-40 group-open:rotate-90 transition-transform">›</span>
                        </summary>
                        <div className="grid gap-3 mt-3">
                            {archivedStacks.map((stack: any) => (
                                <div key={stack.id} className="glass-card" style={{ opacity: 0.7 }}>
                                    <div className="flex justify-between items-start gap-3">
                                        <Link href={`/stacks/${stack.id}`} className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-semibold truncate" style={{ color: 'var(--accent)' }}>{stack.name}</h3>
                                                <span className="chip chip-sm chip-muted">Archived</span>
                                            </div>
                                            <span className="text-eyebrow">{stack.commodity} · {stack.current_stock.toLocaleString()} bales</span>
                                        </Link>
                                        {perms.canWriteInventory && (
                                            <div className="flex gap-1 flex-shrink-0">
                                                <StackActions stackId={stack.id} archived canDelete={perms.canDeleteStacks} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </details>
                )}
                </>
            )}
        </div>
    );
}
