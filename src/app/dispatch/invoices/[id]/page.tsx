import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, MapPin, Scale } from "lucide-react";
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
    const totalBales = invoice.tickets.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
    const totalNetLbs = invoice.tickets.reduce((sum: number, t: any) => sum + (parseFloat(t.net_lbs) || 0), 0);
    const hasPricing = invoice.price_per_unit && parseFloat(invoice.price_per_unit) > 0;
    const totalAmount = parseFloat(invoice.total_amount) || 0;

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

                {/* Pricing & Totals */}
                <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Bales</p>
                        <p className="text-2xl font-bold" style={{ color: 'var(--primary-light)' }}>
                            {totalBales.toLocaleString()}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Tickets</p>
                        <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                            {invoice.tickets.length}
                        </p>
                    </div>
                </div>

                {totalNetLbs > 0 && (
                    <div className="flex items-center gap-2 mb-3 text-sm" style={{ color: 'var(--text-dim)' }}>
                        <Scale size={14} />
                        <span>{totalNetLbs.toLocaleString()} lbs ({(totalNetLbs / 2000).toFixed(2)} tons)</span>
                    </div>
                )}

                {hasPricing && (
                    <div className="pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
                        <div className="flex justify-between text-sm mb-1" style={{ color: 'var(--text-dim)' }}>
                            <span>Rate</span>
                            <span>${parseFloat(invoice.price_per_unit).toFixed(2)} / {invoice.price_unit}</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                            <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Total</span>
                            <span className="text-2xl font-bold" style={{ color: 'var(--primary-light)' }}>
                                ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                )}

                {invoice.notes && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Notes</p>
                        <p className="text-sm" style={{ color: 'var(--text-main)' }}>{invoice.notes}</p>
                    </div>
                )}
            </div>

            {/* Status Actions */}
            <InvoiceStatusActions invoiceId={invoice.id} currentStatus={invoice.status} shareToken={invoice.share_token} />

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
                                    <div className="text-right">
                                        <span className="font-bold" style={{ color: 'var(--primary-light)' }}>
                                            {parseFloat(ticket.amount).toLocaleString()}
                                        </span>
                                        <span className="text-xs ml-1" style={{ color: 'var(--text-dim)' }}>bales</span>
                                        {ticket.net_lbs && (
                                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                                {parseFloat(ticket.net_lbs).toLocaleString()} lbs
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
