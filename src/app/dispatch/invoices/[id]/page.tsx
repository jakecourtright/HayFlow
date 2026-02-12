import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, MapPin, Clock } from "lucide-react";
import { Permissions } from "@/lib/permissions";
import InvoiceStatusActions from "./InvoiceStatusActions";

async function getInvoice(invoiceId: string, orgId: string) {
    const client = await pool.connect();
    try {
        const invoiceRes = await client.query(
            'SELECT * FROM invoices WHERE id = $1 AND org_id = $2',
            [invoiceId, orgId]
        );
        if (invoiceRes.rows.length === 0) return null;

        const ticketsRes = await client.query(`
            SELECT 
                tk.*,
                s.name as stack_name,
                s.commodity,
                l.name as location_name
            FROM tickets tk
            LEFT JOIN stacks s ON s.id = tk.stack_id
            LEFT JOIN locations l ON l.id = tk.location_id
            WHERE tk.invoice_id = $1 AND tk.org_id = $2
            ORDER BY tk.created_at ASC
        `, [invoiceId, orgId]);

        return {
            ...invoiceRes.rows[0],
            tickets: ticketsRes.rows,
        };
    } finally {
        client.release();
    }
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { userId, orgId, has } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    if (!has({ permission: Permissions.INVOICES_MANAGE } as any)) {
        redirect("/tickets");
    }

    const { id } = await params;
    const invoice = await getInvoice(id, orgId);
    if (!invoice) notFound();

    const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
        draft: { bg: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b' },
        sent: { bg: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6' },
        paid: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22c55e' },
    };

    const style = STATUS_STYLES[invoice.status] || STATUS_STYLES.draft;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/dispatch/invoices"
                    className="p-2 rounded-xl transition-colors"
                    style={{ background: 'var(--bg-surface)' }}
                >
                    <ArrowLeft size={20} style={{ color: 'var(--text-dim)' }} />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold" style={{ color: 'var(--accent)' }}>
                            {invoice.invoice_number}
                        </h1>
                        <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full uppercase"
                            style={{ background: style.bg, color: style.text }}
                        >
                            {invoice.status}
                        </span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                        Created {new Date(invoice.created_at).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Summary */}
            <div className="glass-card">
                {invoice.customer && (
                    <div className="mb-3">
                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Customer</p>
                        <p className="font-semibold" style={{ color: 'var(--accent)' }}>{invoice.customer}</p>
                    </div>
                )}
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Total</p>
                        <p className="text-2xl font-bold" style={{ color: 'var(--primary-light)' }}>
                            {parseFloat(invoice.total_amount).toLocaleString()} bales
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Tickets</p>
                        <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                            {invoice.tickets.length}
                        </p>
                    </div>
                </div>
                {invoice.notes && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Notes</p>
                        <p className="text-sm" style={{ color: 'var(--text-main)' }}>{invoice.notes}</p>
                    </div>
                )}
            </div>

            {/* Status Actions */}
            <InvoiceStatusActions invoiceId={invoice.id} currentStatus={invoice.status} />

            {/* Line Items (Tickets) */}
            <div>
                <h2 className="text-sm font-bold mb-3 uppercase" style={{ color: 'var(--text-dim)' }}>
                    Line Items
                </h2>
                <div className="space-y-2">
                    {invoice.tickets.map((ticket: any) => (
                        <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="block">
                            <div className="glass-card p-3 hover:brightness-110 transition-all">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
                                            #{ticket.id}
                                        </span>
                                        <span className="text-sm ml-2" style={{ color: 'var(--text-dim)' }}>
                                            {ticket.stack_name}
                                        </span>
                                        {ticket.location_name && (
                                            <span className="text-xs ml-1" style={{ color: 'var(--text-dim)' }}>
                                                @ {ticket.location_name}
                                            </span>
                                        )}
                                    </div>
                                    <span className="font-bold" style={{ color: 'var(--primary-light)' }}>
                                        {parseFloat(ticket.amount).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
