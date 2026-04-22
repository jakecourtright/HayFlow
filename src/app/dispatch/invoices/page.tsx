import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Permissions } from "@/lib/permissions";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import StatusChip from "@/components/ui/StatusChip";

async function getInvoices(orgId: string) {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT i.*,
                (SELECT COUNT(*) FROM tickets t WHERE t.invoice_id = i.id) as ticket_count
            FROM invoices i
            WHERE i.org_id = $1
            ORDER BY i.created_at DESC
        `, [orgId]);
        return result.rows;
    } finally {
        client.release();
    }
}

export default async function InvoicesPage() {
    const { userId, orgId, has } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    if (!has({ permission: Permissions.INVOICES_MANAGE } as any)) {
        redirect("/tickets");
    }

    const invoices = await getInvoices(orgId);

    return (
        <div>
            <PageHeader
                eyebrow="Billing"
                title="Invoices"
                subtitle="Everything you've compiled for customers."
                backHref="/dispatch"
                backLabel="Dispatch"
            />

            {invoices.length === 0 ? (
                <EmptyState
                    icon={<FileText size={28} />}
                    title="No invoices yet"
                    body="Approve tickets on the Dispatch queue, then bundle them here into a single invoice."
                    cta={{ href: "/dispatch", label: "Go to dispatch" }}
                />
            ) : (
                <ul className="space-y-3" role="list">
                    {invoices.map((inv: any) => {
                        const hasPrice = parseFloat(inv.total_amount) > 0 && inv.price_per_unit;
                        return (
                            <li key={inv.id}>
                                <Link href={`/dispatch/invoices/${inv.id}`} className="glass-card-link p-4 block">
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold" style={{ color: 'var(--accent)' }}>
                                                    {inv.invoice_number}
                                                </span>
                                                <StatusChip status={inv.status} />
                                            </div>
                                            {inv.customer && (
                                                <p className="text-sm mt-1 truncate" style={{ color: 'var(--text)' }}>
                                                    {inv.customer}
                                                </p>
                                            )}
                                            <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                                                {new Date(inv.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                {' · '}
                                                {inv.ticket_count} ticket{inv.ticket_count !== '1' ? 's' : ''}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="text-display-sm" style={{ color: 'var(--primary-light)' }}>
                                                {hasPrice
                                                    ? `$${parseFloat(inv.total_amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                                                    : `${parseFloat(inv.total_amount).toLocaleString()}`}
                                            </span>
                                            {!hasPrice && (
                                                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>bales</p>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
