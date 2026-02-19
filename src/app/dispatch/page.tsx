import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Package, MapPin } from "lucide-react";
import { Permissions } from "@/lib/permissions";
import DispatchQueue from "./DispatchQueue";

async function getDispatchData(orgId: string) {
    const client = await pool.connect();
    try {
        // Get pending and approved tickets
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

        // Get recent invoices
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
    const { userId, orgId, has } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    if (!has({ permission: Permissions.TICKETS_MANAGE } as any)) {
        redirect("/tickets");
    }

    const data = await getDispatchData(orgId);

    const pendingTickets = data.tickets.filter((t: any) => t.status === 'pending');
    const approvedTickets = data.tickets.filter((t: any) => t.status === 'approved');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold" style={{ color: 'var(--accent)' }}>Invoicing</h1>
                <Link href="/dispatch/invoices" className="btn btn-secondary flex items-center gap-2">
                    <FileText size={16} />
                    Invoices
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="glass-card text-center py-4">
                    <p className="text-2xl font-bold" style={{ color: '#f59e0b' }}>
                        {pendingTickets.length}
                    </p>
                    <p className="text-xs font-bold uppercase" style={{ color: 'var(--text-dim)' }}>
                        Pending Review
                    </p>
                </div>
                <div className="glass-card text-center py-4">
                    <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>
                        {approvedTickets.length}
                    </p>
                    <p className="text-xs font-bold uppercase" style={{ color: 'var(--text-dim)' }}>
                        Ready to Invoice
                    </p>
                </div>
            </div>

            {/* Pending Tickets */}
            {pendingTickets.length > 0 && (
                <div>
                    <h2 className="text-sm font-bold mb-3 uppercase" style={{ color: '#f59e0b' }}>
                        Needs Review ({pendingTickets.length})
                    </h2>
                    <div className="space-y-2">
                        {pendingTickets.map((ticket: any) => (
                            <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="block">
                                <div className="glass-card p-4 hover:brightness-110 transition-all" style={{ borderLeft: '3px solid #f59e0b' }}>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <span className="font-bold" style={{ color: 'var(--accent)' }}>
                                                #{ticket.id}
                                            </span>
                                            <span className="text-sm ml-2" style={{ color: 'var(--text-dim)' }}>
                                                {ticket.stack_name}
                                            </span>
                                            {ticket.location_name && (
                                                <span className="text-xs ml-2" style={{ color: 'var(--text-dim)' }}>
                                                    @ {ticket.location_name}
                                                </span>
                                            )}
                                        </div>
                                        <span className="font-bold" style={{ color: 'var(--primary-light)' }}>
                                            {parseFloat(ticket.amount).toLocaleString()} bales
                                        </span>
                                    </div>
                                    {ticket.customer && (
                                        <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                                            → {ticket.customer}
                                        </p>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Approved Tickets — can be compiled into invoices */}
            <DispatchQueue approvedTickets={approvedTickets} />

            {/* Recent Invoices Preview */}
            {data.recentInvoices.length > 0 && (
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-sm font-bold uppercase" style={{ color: 'var(--text-dim)' }}>
                            Recent Invoices
                        </h2>
                        <Link href="/dispatch/invoices" className="text-xs font-bold" style={{ color: 'var(--primary-light)' }}>
                            View All →
                        </Link>
                    </div>
                    <div className="space-y-2">
                        {data.recentInvoices.map((inv: any) => (
                            <Link key={inv.id} href={`/dispatch/invoices/${inv.id}`} className="block">
                                <div className="glass-card p-3 hover:brightness-110 transition-all">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <span className="font-bold" style={{ color: 'var(--accent)' }}>
                                                {inv.invoice_number}
                                            </span>
                                            <span className="text-xs ml-2 px-2 py-0.5 rounded-full" style={{
                                                background: inv.status === 'paid' ? 'rgba(34,197,94,0.2)' : inv.status === 'sent' ? 'rgba(59,130,246,0.2)' : 'rgba(245,158,11,0.2)',
                                                color: inv.status === 'paid' ? '#22c55e' : inv.status === 'sent' ? '#3b82f6' : '#f59e0b',
                                            }}>
                                                {inv.status}
                                            </span>
                                        </div>
                                        <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
                                            {inv.ticket_count} tickets
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {pendingTickets.length === 0 && approvedTickets.length === 0 && (
                <div className="glass-card text-center py-12">
                    <p style={{ color: 'var(--text-dim)' }}>No tickets need attention right now</p>
                </div>
            )}
        </div>
    );
}
