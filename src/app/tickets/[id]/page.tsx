import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Package, MapPin, User, Clock, ArrowRight, Scale, Receipt, FileText } from "lucide-react";
import TicketActions from "./TicketActions";
import { Permissions, checkPermission } from "@/lib/permissions";
import PageHeader from "@/components/ui/PageHeader";
import StatusChip from "@/components/ui/StatusChip";

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

function DetailRow({
    icon,
    label,
    children,
}: {
    icon: React.ReactNode;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5" style={{ color: 'var(--primary-light)' }}>{icon}</div>
            <div className="min-w-0 flex-1">
                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{label}</p>
                <div className="font-semibold" style={{ color: 'var(--accent)' }}>{children}</div>
            </div>
        </div>
    );
}

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    const { id } = await params;
    const ticket = await getTicket(id, orgId);

    if (!ticket) notFound();

    const canManage = await checkPermission(Permissions.TICKETS_MANAGE);
    const isOwner = ticket.driver_id === userId;
    const isBarnToBarn = ticket.type === 'barn_to_barn';

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow={`Ticket · #${ticket.id}`}
                title={isBarnToBarn ? 'Transfer ticket' : 'Sale ticket'}
                subtitle={`Created ${new Date(ticket.created_at).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                })}`}
                backHref="/tickets"
                backLabel="Tickets"
                actions={
                    <div className="flex gap-2">
                        <span className={`chip ${isBarnToBarn ? 'chip-info' : 'chip-success'}`}>
                            {isBarnToBarn ? 'Transfer' : 'Sale'}
                        </span>
                        <StatusChip status={ticket.status} />
                    </div>
                }
            />

            <div className="glass-card space-y-4">
                <DetailRow icon={<Package size={18} />} label="Product">
                    {ticket.stack_name || 'Unknown'}
                    {ticket.commodity && (
                        <span className="font-normal text-sm ml-2" style={{ color: 'var(--text-dim)' }}>
                            {ticket.commodity}
                        </span>
                    )}
                </DetailRow>

                {isBarnToBarn ? (
                    <DetailRow icon={<MapPin size={18} />} label="Transfer route">
                        <span className="inline-flex items-center gap-2 flex-wrap">
                            {ticket.location_name || 'Unknown'}
                            <ArrowRight size={14} style={{ color: 'var(--text-dim)' }} />
                            {ticket.destination_name || 'Unknown'}
                        </span>
                    </DetailRow>
                ) : (
                    ticket.location_name && (
                        <DetailRow icon={<MapPin size={18} />} label="Pick-up location">
                            {ticket.location_name}
                        </DetailRow>
                    )
                )}

                <DetailRow icon={<Clock size={18} />} label="Quantity">
                    <span className="text-lg">
                        {parseFloat(ticket.amount).toLocaleString()}{' '}
                        <span className="font-normal text-sm" style={{ color: 'var(--text-dim)' }}>bales</span>
                    </span>
                </DetailRow>

                {!isBarnToBarn && ticket.net_lbs && (
                    <DetailRow icon={<Scale size={18} />} label="Net weight">
                        {parseFloat(ticket.net_lbs).toLocaleString()} lbs
                    </DetailRow>
                )}

                {!isBarnToBarn && ticket.customer && (
                    <DetailRow icon={<User size={18} />} label="Customer">
                        {ticket.customer}
                    </DetailRow>
                )}

                {ticket.notes && (
                    <div className="pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
                        <p className="text-xs mb-1" style={{ color: 'var(--text-dim)' }}>
                            {isBarnToBarn ? 'Comments' : 'Notes'}
                        </p>
                        <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-main)' }}>
                            {ticket.notes}
                        </p>
                    </div>
                )}

                {(ticket.invoice_number || ticket.transaction_id) && (
                    <div className="pt-4 flex flex-wrap gap-2" style={{ borderTop: '1px solid var(--glass-border)' }}>
                        {ticket.invoice_number && (
                            <Link
                                href={`/dispatch/invoices/${ticket.invoice_id}`}
                                className="btn btn-ghost btn-sm"
                            >
                                <Receipt size={14} />
                                Invoice {ticket.invoice_number}
                            </Link>
                        )}
                        {ticket.transaction_id && (
                            <Link
                                href={`/transactions/${ticket.transaction_id}`}
                                className="btn btn-ghost btn-sm"
                            >
                                <FileText size={14} />
                                Transaction #{ticket.transaction_id}
                            </Link>
                        )}
                    </div>
                )}
            </div>

            <TicketActions
                ticketId={ticket.id}
                status={ticket.status}
                canManage={canManage}
                isOwner={isOwner}
            />
        </div>
    );
}
