import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, ArrowRight, Ticket } from "lucide-react";
import { Permissions, checkPermission } from "@/lib/permissions";
import DispatchQueue from "./DispatchQueue";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import StatusChip from "@/components/ui/StatusChip";

async function getDispatchData(orgId: string) {
    const client = await pool.connect();
    try {
        const ticketsRes = await client.query(`
            SELECT
                tk.*,
                s.name as stack_name,
                s.commodity,
                l.name as location_name
            FROM tickets tk
            LEFT JOIN stacks s ON s.id = tk.stack_id
            LEFT JOIN locations l ON l.id = tk.location_id
            WHERE tk.org_id = $1 AND tk.status IN ('pending', 'approved') AND tk.type = 'sale'
            ORDER BY
                CASE tk.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 END,
                tk.created_at DESC
        `, [orgId]);

        const invoicesRes = await client.query(`
            SELECT i.*,
                (SELECT COUNT(*) FROM tickets t WHERE t.invoice_id = i.id) as ticket_count
            FROM invoices i
            WHERE i.org_id = $1
            ORDER BY i.created_at DESC
            LIMIT 5
        `, [orgId]);

        return {
            tickets: ticketsRes.rows,
            recentInvoices: invoicesRes.rows,
        };
    } finally {
        client.release();
    }
}

export default async function DispatchPage() {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    if (!(await checkPermission(Permissions.TICKETS_MANAGE))) {
        redirect("/tickets");
    }

    const data = await getDispatchData(orgId);

    const pendingTickets = data.tickets.filter((t: any) => t.status === 'pending');
    const approvedTickets = data.tickets.filter((t: any) => t.status === 'approved');

    const hasWork = pendingTickets.length > 0 || approvedTickets.length > 0;

    return (
        <div>
            <PageHeader
                eyebrow="Dispatch"
                title="Invoicing queue"
                subtitle="Review pending tickets and bundle approved loads into clean invoices."
                actions={
                    <div className="flex gap-2">
                        <Link href="/tickets" className="btn btn-secondary btn-sm">
                            <Ticket size={16} />
                            All tickets
                        </Link>
                        <Link href="/dispatch/invoices" className="btn btn-secondary btn-sm">
                            <FileText size={16} />
                            All invoices
                        </Link>
                    </div>
                }
            />

            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="surface-card text-center py-4">
                    <p className="text-display-md" style={{ color: 'var(--warning)' }}>
                        {pendingTickets.length}
                    </p>
                    <p className="text-eyebrow mt-1">Needs review</p>
                </div>
                <div className="surface-card text-center py-4">
                    <p className="text-display-md" style={{ color: 'var(--success)' }}>
                        {approvedTickets.length}
                    </p>
                    <p className="text-eyebrow mt-1">Ready to invoice</p>
                </div>
            </div>

            {pendingTickets.length > 0 && (
                <section className="mb-6">
                    <h2 className="text-eyebrow mb-3" style={{ color: 'var(--warning)' }}>
                        Needs review ({pendingTickets.length})
                    </h2>
                    <div className="space-y-2">
                        {pendingTickets.map((ticket: any) => (
                            <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="glass-card-link p-4 block" style={{ borderLeft: '3px solid var(--warning)' }}>
                                <div className="flex justify-between items-center gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-baseline gap-2 flex-wrap">
                                            <span className="font-bold" style={{ color: 'var(--accent)' }}>
                                                #{ticket.id}
                                            </span>
                                            <span className="text-sm truncate" style={{ color: 'var(--text)' }}>
                                                {ticket.stack_name}
                                            </span>
                                        </div>
                                        {ticket.customer && (
                                            <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                                                → {ticket.customer}
                                            </p>
                                        )}
                                        {ticket.location_name && (
                                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                                @ {ticket.location_name}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="font-bold" style={{ color: 'var(--primary-light)' }}>
                                            {parseFloat(ticket.amount).toLocaleString()}
                                        </div>
                                        <div className="text-xs" style={{ color: 'var(--text-dim)' }}>bales</div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            <DispatchQueue approvedTickets={approvedTickets} />

            {data.recentInvoices.length > 0 && (
                <section className="mt-8">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-eyebrow">Recent invoices</h2>
                        <Link href="/dispatch/invoices" className="text-xs font-bold inline-flex items-center gap-1" style={{ color: 'var(--primary-light)' }}>
                            View all <ArrowRight size={12} />
                        </Link>
                    </div>
                    <div className="space-y-2">
                        {data.recentInvoices.map((inv: any) => (
                            <Link key={inv.id} href={`/dispatch/invoices/${inv.id}`} className="glass-card-link p-3 block">
                                <div className="flex justify-between items-center gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="font-bold truncate" style={{ color: 'var(--accent)' }}>
                                            {inv.invoice_number}
                                        </span>
                                        <StatusChip status={inv.status} />
                                    </div>
                                    <span className="text-xs shrink-0" style={{ color: 'var(--text-dim)' }}>
                                        {inv.ticket_count} ticket{inv.ticket_count === '1' ? '' : 's'}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {!hasWork && (
                <EmptyState
                    icon={<FileText size={28} />}
                    title="Queue is clear"
                    body="No tickets waiting for review or invoicing. New sale tickets show up here for approval."
                    cta={{ href: "/tickets/new", label: "New ticket" }}
                />
            )}
        </div>
    );
}
