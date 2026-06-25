import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Tractor, ShoppingCart, Banknote, Wrench, History, ArrowLeftRight } from "lucide-react";
import { balesToTons, getDefaultWeight } from "@/lib/units";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

async function getAllTransactions(orgId: string) {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT
                t.*,
                s.name as stack_name,
                s.commodity,
                s.bale_size,
                s.weight_per_bale,
                l.name as location_name
            FROM transactions t
            LEFT JOIN stacks s ON s.id = t.stack_id
            LEFT JOIN locations l ON l.id = t.location_id
            WHERE t.org_id = $1
            ORDER BY t.date DESC
        `, [orgId]);

        return result.rows;
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
        case 'adjustment': return 'Adjusted';
        case 'transfer_out': return 'Transferred out';
        case 'transfer_in': return 'Transferred in';
        default: return 'Transaction';
    }
}

export default async function TransactionsPage() {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    const transactions = await getAllTransactions(orgId);

    const groupedByDate: Record<string, typeof transactions> = {};
    transactions.forEach(tx => {
        const dateKey = new Date(tx.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
        groupedByDate[dateKey].push(tx);
    });

    return (
        <div>
            <PageHeader
                eyebrow="Ledger"
                title="Transactions"
                subtitle={`${transactions.length} recorded movement${transactions.length === 1 ? '' : 's'}.`}
                backHref="/"
                backLabel="Home"
            />

            {Object.keys(groupedByDate).length === 0 ? (
                <EmptyState
                    icon={<History size={28} />}
                    title="No transactions yet"
                    body="Record your first baling, purchase, or sale ticket and it'll show up here."
                    cta={{ href: "/tickets/new", label: "New ticket" }}
                />
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedByDate).map(([date, txList]) => (
                        <section key={date}>
                            <h2 className="text-eyebrow mb-3">{date}</h2>
                            <ul className="space-y-2" role="list">
                                {txList.map((tx: any) => {
                                    const amount = parseFloat(tx.amount);
                                    const weight = tx.weight_per_bale || getDefaultWeight(tx.bale_size || '3x4');
                                    const tons = balesToTons(amount, weight);
                                    const isSale = tx.type === 'sale';
                                    const isOutflow = isSale || tx.type === 'transfer_out';
                                    const tintColor = isSale ? 'var(--error)' : 'var(--primary-light)';
                                    const tintBg = isSale
                                        ? 'color-mix(in srgb, var(--error) 16%, transparent)'
                                        : 'color-mix(in srgb, var(--primary) 18%, transparent)';

                                    return (
                                        <li key={tx.id}>
                                            <Link href={`/transactions/${tx.id}`} className="glass-card-link p-4 block">
                                                <div className="flex justify-between items-start gap-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div
                                                            className="p-2 rounded-lg shrink-0"
                                                            style={{ background: tintBg, color: tintColor }}
                                                            aria-hidden
                                                        >
                                                            {getTransactionIcon(tx.type)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold truncate" style={{ color: 'var(--accent)' }}>
                                                                {getTransactionLabel(tx.type)}: {tx.stack_name || 'Unknown'}
                                                            </p>
                                                            <p className="text-xs truncate" style={{ color: 'var(--text-dim)' }}>
                                                                {tx.location_name || 'No location'}{tx.entity ? ` • ${tx.entity}` : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-display-sm" style={{ color: tintColor }}>
                                                            {isOutflow ? '−' : '+'}{amount.toLocaleString()}
                                                        </p>
                                                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                                            {tons.toFixed(2)} tons
                                                        </p>
                                                    </div>
                                                </div>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}
