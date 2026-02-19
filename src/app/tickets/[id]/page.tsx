import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, MapPin, User, Clock, ArrowRight, Scale } from "lucide-react";
import TicketActions from "./TicketActions";
import { Permissions } from "@/lib/permissions";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b', label: 'Pending' },
    approved: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22c55e', label: 'Approved' },
    rejected: { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444', label: 'Rejected' },
    invoiced: { bg: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6', label: 'Invoiced' },
};

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    sale: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', label: 'Sale' },
    barn_to_barn: { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6', label: 'Barn to Barn' },
};

async function getTicket(ticketId: string, orgId: string) {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT 
                tk.*,
                s.name as stack_name,
                s.commodity,
                s.bale_size,
                l.name as location_name,
                dl.name as destination_name,
                i.invoice_number
            FROM tickets tk
            LEFT JOIN stacks s ON s.id = tk.stack_id
            LEFT JOIN locations l ON l.id = tk.location_id
            LEFT JOIN locations dl ON dl.id = tk.destination_id
            LEFT JOIN invoices i ON i.id = tk.invoice_id
            WHERE tk.id = $1 AND tk.org_id = $2
        `, [ticketId, orgId]);
        return result.rows[0] || null;
    } finally {
        client.release();
    }
}

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { userId, orgId, has } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    const { id } = await params;
    const ticket = await getTicket(id, orgId);

    if (!ticket) notFound();

    const style = STATUS_STYLES[ticket.status] || STATUS_STYLES.pending;
    const typeStyle = TYPE_STYLES[ticket.type] || TYPE_STYLES.sale;
    const canManage = has({ permission: Permissions.TICKETS_MANAGE } as any);
    const isOwner = ticket.driver_id === userId;
    const isBarnToBarn = ticket.type === 'barn_to_barn';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/tickets"
                    className="p-2 rounded-xl transition-colors"
                    style={{ background: 'var(--bg-surface)' }}
                >
                    <ArrowLeft size={20} style={{ color: 'var(--text-dim)' }} />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold" style={{ color: 'var(--accent)' }}>
                            Ticket #{ticket.id}
                        </h1>
                        <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ background: typeStyle.bg, color: typeStyle.text }}
                        >
                            {typeStyle.label}
                        </span>
                        <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ background: style.bg, color: style.text }}
                        >
                            {style.label}
                        </span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                        Created {new Date(ticket.created_at).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Ticket Details */}
            <div className="glass-card space-y-4">
                <div className="flex items-center gap-3">
                    <Package size={18} style={{ color: 'var(--primary-light)' }} />
                    <div>
                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Product</p>
                        <p className="font-semibold" style={{ color: 'var(--accent)' }}>
                            {ticket.stack_name || 'Unknown'}{ticket.commodity ? ` — ${ticket.commodity}` : ''}
                        </p>
                    </div>
                </div>

                {isBarnToBarn ? (
                    /* B2B: show source → destination */
                    <div className="flex items-center gap-3">
                        <MapPin size={18} style={{ color: 'var(--primary-light)' }} />
                        <div>
                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Transfer Route</p>
                            <p className="font-semibold flex items-center gap-2" style={{ color: 'var(--accent)' }}>
                                {ticket.location_name || 'Unknown'}
                                <ArrowRight size={16} style={{ color: 'var(--text-dim)' }} />
                                {ticket.destination_name || 'Unknown'}
                            </p>
                        </div>
                    </div>
                ) : (
                    ticket.location_name && (
                        <div className="flex items-center gap-3">
                            <MapPin size={18} style={{ color: 'var(--primary-light)' }} />
                            <div>
                                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Pick-up Location</p>
                                <p className="font-semibold" style={{ color: 'var(--accent)' }}>{ticket.location_name}</p>
                            </div>
                        </div>
                    )
                )}

                <div className="flex items-center gap-3">
                    <Clock size={18} style={{ color: 'var(--primary-light)' }} />
                    <div>
                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Quantity</p>
                        <p className="font-semibold text-lg" style={{ color: 'var(--accent)' }}>
                            {parseFloat(ticket.amount).toLocaleString()} bales
                        </p>
                    </div>
                </div>

                {/* Net Lbs (Sale only) */}
                {!isBarnToBarn && ticket.net_lbs && (
                    <div className="flex items-center gap-3">
                        <Scale size={18} style={{ color: 'var(--primary-light)' }} />
                        <div>
                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Net Weight</p>
                            <p className="font-semibold" style={{ color: 'var(--accent)' }}>
                                {parseFloat(ticket.net_lbs).toLocaleString()} lbs
                            </p>
                        </div>
                    </div>
                )}

                {/* Customer (Sale only) */}
                {!isBarnToBarn && ticket.customer && (
                    <div className="flex items-center gap-3">
                        <User size={18} style={{ color: 'var(--primary-light)' }} />
                        <div>
                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Customer</p>
                            <p className="font-semibold" style={{ color: 'var(--accent)' }}>{ticket.customer}</p>
                        </div>
                    </div>
                )}

                {ticket.notes && (
                    <div className="pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
                        <p className="text-xs mb-1" style={{ color: 'var(--text-dim)' }}>
                            {isBarnToBarn ? 'Comments' : 'Notes'}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--text-main)' }}>{ticket.notes}</p>
                    </div>
                )}

                {ticket.invoice_number && (
                    <div className="pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Invoice</p>
                        <Link
                            href={`/dispatch/invoices/${ticket.invoice_id}`}
                            className="font-semibold hover:underline"
                            style={{ color: 'var(--primary-light)' }}
                        >
                            {ticket.invoice_number}
                        </Link>
                    </div>
                )}

                {ticket.transaction_id && (
                    <div className="pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Linked Transaction</p>
                        <Link
                            href={`/transactions/${ticket.transaction_id}`}
                            className="font-semibold hover:underline"
                            style={{ color: 'var(--primary-light)' }}
                        >
                            Transaction #{ticket.transaction_id}
                        </Link>
                    </div>
                )}
            </div>

            {/* Actions */}
            <TicketActions
                ticketId={ticket.id}
                status={ticket.status}
                canManage={canManage}
                isOwner={isOwner}
            />
        </div>
    );
}
