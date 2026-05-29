import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Ticket, Package, MapPin, ArrowRight } from "lucide-react";
import { Roles } from "@/lib/permissions";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import StatusChip from "@/components/ui/StatusChip";

const TYPE_LABELS: Record<string, { label: string; variant: "success" | "info" }> = {
    sale: { label: "Sale", variant: "success" },
    barn_to_barn: { label: "Transfer", variant: "info" },
};

async function getTickets(orgId: string, driverIdOrNull: string | null) {
    const client = await pool.connect();
    try {
        const baseQuery = `
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
            WHERE tk.org_id = $1`;

        if (driverIdOrNull) {
            const result = await client.query(
                `${baseQuery} AND tk.driver_id = $2 ORDER BY tk.created_at DESC`,
                [orgId, driverIdOrNull]
            );
            return result.rows;
        }
        const result = await client.query(
            `${baseQuery} ORDER BY tk.created_at DESC`,
            [orgId]
        );
        return result.rows;
    } finally {
        client.release();
    }
}

export default async function TicketsPage() {
    const { userId, orgId, has } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    const isDriver = has({ role: Roles.DRIVER } as any);
    const tickets = await getTickets(orgId, isDriver ? userId : null);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Tickets"
                subtitle={isDriver ? "Your tickets — pending approval appear at the top." : "Every sale and transfer recorded by the team."}
                actions={
                    <Link href="/tickets/new" data-tour="new-ticket" className="btn btn-primary btn-sm">
                        <Plus size={16} />
                        <span className="hidden sm:inline">New ticket</span>
                        <span className="sm:hidden">New</span>
                    </Link>
                }
            />

            {tickets.length === 0 ? (
                <EmptyState
                    icon={<Ticket className="w-7 h-7" />}
                    title="No tickets yet"
                    body={isDriver
                        ? "Record a load out from the field — the office will approve and invoice it."
                        : "Tickets are the source of every invoice. Create one from the field or bulk-record from the office."}
                    ctaHref="/tickets/new"
                    ctaLabel="Create your first ticket"
                />
            ) : (
                <div className="space-y-3">
                    {tickets.map((ticket: any) => {
                        const type = TYPE_LABELS[ticket.type] || TYPE_LABELS.sale;
                        return (
                            <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="block">
                                <div className="glass-card glass-card-link p-4">
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className="font-bold" style={{ color: "var(--accent)" }}>
                                                    #{ticket.id}
                                                </span>
                                                <span className={`chip chip-sm chip-${type.variant}`}>{type.label}</span>
                                                <StatusChip status={ticket.status} size="sm" />
                                            </div>
                                            <div className="flex items-center gap-3 text-sm flex-wrap" style={{ color: "var(--text-dim)" }}>
                                                <span className="flex items-center gap-1">
                                                    <Package size={12} />
                                                    {ticket.stack_name || "Unknown stack"}
                                                </span>
                                                {ticket.type === "barn_to_barn" ? (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin size={12} />
                                                        {ticket.location_name || "?"}
                                                        <ArrowRight size={12} />
                                                        {ticket.destination_name || "?"}
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
                                                <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
                                                    {ticket.customer}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className="flex items-baseline gap-1 justify-end">
                                                <span className="text-lg font-bold" style={{ color: "var(--primary-light)" }}>
                                                    {parseFloat(ticket.amount).toLocaleString()}
                                                </span>
                                                <span className="text-xs" style={{ color: "var(--text-dim)" }}>
                                                    bales
                                                </span>
                                            </div>
                                            <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                                                {new Date(ticket.created_at).toLocaleDateString(undefined, {
                                                    month: "short",
                                                    day: "numeric",
                                                })}
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
