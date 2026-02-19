import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { Permissions } from "@/lib/permissions";

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
    draft: { bg: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b' },
    sent: { bg: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6' },
    paid: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22c55e' },
};

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
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/dispatch"
                    className="p-2 rounded-xl transition-colors"
                    style={{ background: 'var(--bg-surface)' }}
                >
                    <ArrowLeft size={20} style={{ color: 'var(--text-dim)' }} />
                </Link>
                <h1 className="text-xl font-bold" style={{ color: 'var(--accent)' }}>Invoices</h1>
            </div>

            {invoices.length === 0 ? (
                <div className="glass-card text-center py-12">
                    <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-dim)' }} />
                    <p style={{ color: 'var(--text-dim)' }}>No invoices yet</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>
                        Approve tickets and compile them from the Dispatch page
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {invoices.map((inv: any) => {
                        const style = STATUS_STYLES[inv.status] || STATUS_STYLES.draft;
                        return (
                            <Link key={inv.id} href={`/dispatch/invoices/${inv.id}`} className="block">
                                <div className="glass-card p-4 hover:brightness-110 transition-all">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold" style={{ color: 'var(--accent)' }}>
                                                    {inv.invoice_number}
                                                </span>
                                                <span
                                                    className="text-xs font-bold px-2 py-0.5 rounded-full uppercase"
                                                    style={{ background: style.bg, color: style.text }}
                                                >
                                                    {inv.status}
                                                </span>
                                            </div>
                                            {inv.customer && (
                                                <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>
                                                    {inv.customer}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <span className="text-lg font-bold" style={{ color: 'var(--primary-light)' }}>
                                                {parseFloat(inv.total_amount) > 0 && inv.price_per_unit
                                                    ? `$${parseFloat(inv.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                    : `${parseFloat(inv.total_amount).toLocaleString()} bales`
                                                }
                                            </span>
                                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                                {inv.ticket_count} ticket{inv.ticket_count !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-xs mt-2" style={{ color: 'var(--text-dim)' }}>
                                        {new Date(inv.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
