import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Tractor, ShoppingCart, Banknote, Wrench, MapPin, Package, Pencil } from "lucide-react";
import { balesToTons, resolveWeight } from "@/lib/units";
import PageHeader from "@/components/ui/PageHeader";

async function getTransaction(transactionId: string, orgId: string) {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT
                t.*,
                s.name as stack_name,
                s.commodity,
                s.bale_size,
                s.weight_per_bale,
                s.price_unit,
                l.name as location_name
            FROM transactions t
            LEFT JOIN stacks s ON s.id = t.stack_id
            LEFT JOIN locations l ON l.id = t.location_id
            WHERE t.id = $1 AND t.org_id = $2
        `, [transactionId, orgId]);

        return result.rows[0] || null;
    } finally {
        client.release();
    }
}

function getTransactionIcon(type: string) {
    switch (type) {
        case 'production': return <Tractor size={24} />;
        case 'purchase': return <ShoppingCart size={24} />;
        case 'sale': return <Banknote size={24} />;
        default: return <Wrench size={24} />;
    }
}

function getTransactionLabel(type: string) {
    switch (type) {
        case 'production': return 'Production';
        case 'purchase': return 'Purchase';
        case 'sale': return 'Sale';
        case 'adjustment': return 'Adjustment';
        default: return 'Transaction';
    }
}

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    const { id } = await params;
    const tx = await getTransaction(id, orgId);
    if (!tx) notFound();

    const amount = parseFloat(tx.amount);
    const weight = resolveWeight(tx.weight_per_bale, tx.bale_size);
    const tons = balesToTons(amount, weight);
    const isSale = tx.type === 'sale';
    const tintColor = isSale ? 'var(--error)' : 'var(--primary-light)';
    const tintBg = isSale
        ? 'color-mix(in srgb, var(--error) 16%, transparent)'
        : 'color-mix(in srgb, var(--primary) 18%, transparent)';

    const longDate = new Date(tx.date).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <div>
            <PageHeader
                eyebrow={getTransactionLabel(tx.type)}
                title={tx.stack_name || 'Transaction'}
                subtitle={longDate}
                backHref="/transactions"
                backLabel="Transactions"
                actions={
                    <Link
                        href={`/transactions/${id}/edit`}
                        className="icon-button"
                        aria-label="Edit transaction"
                        title="Edit transaction"
                    >
                        <Pencil size={16} />
                    </Link>
                }
            />

            <div className="glass-card mb-4">
                <div className="flex items-center gap-4 mb-6">
                    <div
                        className="p-4 rounded-xl"
                        style={{ background: tintBg, color: tintColor }}
                        aria-hidden
                    >
                        {getTransactionIcon(tx.type)}
                    </div>
                    <div>
                        <p className="text-eyebrow">{getTransactionLabel(tx.type)}</p>
                        <p className="text-display-md" style={{ color: tintColor }}>
                            {isSale ? '−' : '+'}{amount.toLocaleString()}
                            <span className="text-lg ml-2" style={{ color: 'var(--text-dim)' }}>bales</span>
                        </p>
                        <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                            {tons.toFixed(2)} tons
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
                    <div className="col-span-2">
                        <div className="flex items-center gap-2 mb-1">
                            <Package size={14} style={{ color: 'var(--text-dim)' }} />
                            <span className="text-eyebrow">Product</span>
                        </div>
                        <Link href={`/stacks/${tx.stack_id}`} className="hover:opacity-80 transition-opacity">
                            <p className="font-semibold" style={{ color: 'var(--accent)' }}>{tx.stack_name}</p>
                            <p className="text-xs" style={{ color: 'var(--primary-light)' }}>{tx.commodity}</p>
                        </Link>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <MapPin size={14} style={{ color: 'var(--text-dim)' }} />
                            <span className="text-eyebrow">
                                {isSale ? 'From' : 'To'}
                            </span>
                        </div>
                        {tx.location_name ? (
                            <Link href={`/locations/${tx.location_id}`} className="hover:opacity-80 transition-opacity">
                                <p className="font-semibold" style={{ color: 'var(--accent)' }}>
                                    {tx.location_name}
                                </p>
                            </Link>
                        ) : (
                            <p style={{ color: 'var(--text-dim)' }}>No location</p>
                        )}
                    </div>

                    <div>
                        <span className="text-eyebrow block mb-1">Price</span>
                        <p className="font-semibold" style={{ color: 'var(--accent)' }}>
                            ${parseFloat(tx.price || 0).toFixed(2)}
                            <span className="text-xs ml-1" style={{ color: 'var(--text-dim)' }}>
                                /{tx.price_unit || 'bale'}
                            </span>
                        </p>
                    </div>
                </div>

                {tx.entity && (
                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
                        <span className="text-eyebrow block mb-1">
                            {isSale ? 'Buyer' : tx.type === 'purchase' ? 'Seller' : 'Notes'}
                        </span>
                        <p style={{ color: 'var(--accent)' }}>{tx.entity}</p>
                    </div>
                )}
            </div>

            <div className="glass-card">
                <h2 className="text-eyebrow mb-4">Value summary</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <span className="text-eyebrow block mb-1">Quantity</span>
                        <span className="text-lg font-semibold" style={{ color: 'var(--accent)' }}>
                            {amount.toLocaleString()} bales
                        </span>
                    </div>
                    <div>
                        <span className="text-eyebrow block mb-1">Weight</span>
                        <span className="text-lg font-semibold" style={{ color: 'var(--accent)' }}>
                            {tons.toFixed(2)} tons
                        </span>
                    </div>
                    <div>
                        <span className="text-eyebrow block mb-1">Unit price</span>
                        <span className="text-lg font-semibold" style={{ color: 'var(--accent)' }}>
                            ${parseFloat(tx.price || 0).toFixed(2)}
                        </span>
                    </div>
                    <div>
                        <span className="text-eyebrow block mb-1">Total value</span>
                        <span className="text-lg font-semibold" style={{ color: tintColor }}>
                            ${(amount * parseFloat(tx.price || 0)).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
