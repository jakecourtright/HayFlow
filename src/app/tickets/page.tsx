import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Ticket, Package, MapPin, ArrowRight } from "lucide-react";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b', label: 'Pending' },
    approved: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22c55e', label: 'Approved' },
    rejected: { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444', label: 'Rejected' },
    invoiced: { bg: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6', label: 'Invoiced' },
};

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    sale: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', label: 'Sale' },
    barn_to_barn: { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6', label: 'B2B' },
};

async function getTickets(orgId: string, userId: string) {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT 
                tk.*,
                s.name as stack_name,
                s.commodity,
                l.name as location_name,
                dl.name as destination_name
            FROM tickets tk
            LEFT JOIN stacks s ON s.id = tk.stack_id
            LEFT JOIN locations l ON l.id = tk.location_id
            LEFT JOIN locations dl ON dl.id = tk.destination_id
            WHERE tk.org_id = $1
            ORDER BY tk.created_at DESC
        `, [orgId]);
        return result.rows;
    } finally {
        client.release();
    }
}

export default async function TicketsPage() {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    const tickets = await getTickets(orgId, userId);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold" style={{ color: 'var(--accent)' }}>Tickets</h1>
                <Link href="/tickets/new" className="btn btn-primary flex items-center gap-2">
                    <Plus size={16} />
                    New Ticket
                </Link>
            </div>

            {tickets.length === 0 ? (
                <div className="glass-card text-center py-12">
                    <Ticket className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-dim)' }} />
                    <p className="mb-4" style={{ color: 'var(--text-dim)' }}>No tickets yet</p>
                    <Link href="/tickets/new" className="btn btn-primary">
                        Create Your First Ticket
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {tickets.map((ticket: any) => {
                        const style = STATUS_STYLES[ticket.status] || STATUS_STYLES.pending;
                        const typeStyle = TYPE_STYLES[ticket.type] || TYPE_STYLES.sale;
                        return (
                            <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="block">
                                <div className="glass-card p-4 hover:brightness-110 transition-all">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold" style={{ color: 'var(--accent)' }}>
                                                    Ticket #{ticket.id}
                                                </span>
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
                                            <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-dim)' }}>
                                                <span className="flex items-center gap-1">
                                                    <Package size={12} />
                                                    {ticket.stack_name || 'Unknown'}
                                                </span>
                                                {ticket.type === 'barn_to_barn' ? (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin size={12} />
                                                        {ticket.location_name || '?'}
                                                        <ArrowRight size={12} />
                                                        {ticket.destination_name || '?'}
                                                    </span>
                                                ) : (
                                                    ticket.location_name && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin size={12} />
                                                            {ticket.location_name}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                            {ticket.customer && (
                                                <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                                                    Customer: {ticket.customer}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <span className="text-lg font-bold" style={{ color: 'var(--primary-light)' }}>
                                                {parseFloat(ticket.amount).toLocaleString()}
                                            </span>
                                            <span className="text-xs ml-1" style={{ color: 'var(--text-dim)' }}>bales</span>
                                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                                {new Date(ticket.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
