import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Permissions } from "@/lib/permissions";
import InvoiceStatusActions from "./InvoiceStatusActions";
import PageHeader from "@/components/ui/PageHeader";
import StatusChip from "@/components/ui/StatusChip";

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

    const totalBales = invoice.tickets.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
    const totalNetLbs = invoice.tickets.reduce((sum: number, t: any) => sum + (parseFloat(t.net_lbs) || 0), 0);
    const hasPricing = invoice.price_per_unit && parseFloat(invoice.price_per_unit) > 0;
    const totalAmount = parseFloat(invoice.total_amount) || 0;
    const pricePerUnit = parseFloat(invoice.price_per_unit) || 0;

    const invoiceDate = new Date(invoice.created_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <div>
            <PageHeader
                eyebrow="Invoice"
                title={invoice.invoice_number}
                subtitle={invoice.customer || 'No customer'}
                backHref="/dispatch/invoices"
                backLabel="Invoices"
                actions={<StatusChip status={invoice.status} />}
            />

            <article className="glass-card space-y-5">
                <div className="flex justify-between items-start gap-4">
                    <div>
                        <p className="text-eyebrow">Invoice</p>
                        <p className="text-display-sm" style={{ color: 'var(--accent)' }}>{invoice.invoice_number}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-eyebrow">Date</p>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>{invoiceDate}</p>
                    </div>
                </div>

                {invoice.customer && (
                    <div>
                        <p className="text-eyebrow mb-0.5">Bill to</p>
                        <p className="font-semibold" style={{ color: 'var(--text-main)' }}>{invoice.customer}</p>
                    </div>
                )}

                <div>
                    <div className="grid grid-cols-12 gap-2 text-xs font-bold uppercase tracking-wider pb-2 mb-1"
                        style={{ color: 'var(--text-dim)', borderBottom: '2px solid var(--glass-border)' }}>
                        <div className="col-span-5">Description</div>
                        <div className="col-span-2 text-right">Qty</div>
                        <div className="col-span-2 text-right">Weight</div>
                        {hasPricing && <div className="col-span-3 text-right">Amount</div>}
                    </div>

                    {invoice.tickets.map((ticket: any) => {
                        const ticketNetLbs = parseFloat(ticket.net_lbs) || 0;
                        const ticketBales = parseFloat(ticket.amount);
                        let lineAmount = 0;
                        if (hasPricing) {
                            lineAmount = invoice.price_unit === 'ton'
                                ? (ticketNetLbs / 2000) * pricePerUnit
                                : ticketBales * pricePerUnit;
                        }

                        return (
                            <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="block hover:brightness-110 transition-all">
                                <div className="grid grid-cols-12 gap-2 py-2.5 items-center"
                                    style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                    <div className="col-span-5 min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-main)' }}>
                                            {ticket.stack_name}
                                        </p>
                                        <p className="text-xs truncate" style={{ color: 'var(--text-dim)' }}>
                                            {ticket.commodity}{ticket.location_name ? ` • ${ticket.location_name}` : ''}
                                        </p>
                                    </div>
                                    <div className="col-span-2 text-right">
                                        <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                                            {ticketBales.toLocaleString()}
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>bales</p>
                                    </div>
                                    <div className="col-span-2 text-right">
                                        {ticketNetLbs > 0 ? (
                                            <>
                                                <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                                                    {ticketNetLbs.toLocaleString()}
                                                </p>
                                                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>lbs</p>
                                            </>
                                        ) : (
                                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>—</p>
                                        )}
                                    </div>
                                    {hasPricing && (
                                        <div className="col-span-3 text-right">
                                            <p className="text-sm font-bold" style={{ color: 'var(--primary-light)' }}>
                                                ${lineAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>

                <div className="space-y-2 pt-1">
                    <div className="flex justify-between text-sm" style={{ color: 'var(--text-dim)' }}>
                        <span>Total bales</span>
                        <span className="font-medium">{totalBales.toLocaleString()}</span>
                    </div>
                    {totalNetLbs > 0 && (
                        <div className="flex justify-between text-sm" style={{ color: 'var(--text-dim)' }}>
                            <span>Total weight</span>
                            <span className="font-medium">{totalNetLbs.toLocaleString()} lbs ({(totalNetLbs / 2000).toFixed(2)} tons)</span>
                        </div>
                    )}
                    {hasPricing && (
                        <div className="flex justify-between text-sm" style={{ color: 'var(--text-dim)' }}>
                            <span>Rate</span>
                            <span className="font-medium">${pricePerUnit.toFixed(2)} / {invoice.price_unit}</span>
                        </div>
                    )}

                    {hasPricing && (
                        <div className="flex justify-between items-baseline pt-3 mt-1"
                            style={{ borderTop: '2px solid var(--glass-border)' }}>
                            <span className="text-eyebrow">Total due</span>
                            <span className="text-display-md" style={{ color: 'var(--primary-light)' }}>
                                ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    )}
                </div>

                {invoice.notes && (
                    <div className="pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
                        <p className="text-eyebrow mb-1">Notes</p>
                        <p className="text-sm" style={{ color: 'var(--text-main)' }}>{invoice.notes}</p>
                    </div>
                )}
            </article>

            <div className="mt-4">
                <InvoiceStatusActions invoiceId={invoice.id} currentStatus={invoice.status} shareToken={invoice.share_token} />
            </div>
        </div>
    );
}
