import pool from "@/lib/db";
import { notFound } from "next/navigation";
import PrintButton from "./PrintButton";

async function getInvoiceByToken(token: string) {
    const client = await pool.connect();
    try {
        const invoiceRes = await client.query(
            'SELECT * FROM invoices WHERE share_token = $1',
            [token]
        );
        if (invoiceRes.rows.length === 0) return null;

        const invoice = invoiceRes.rows[0];
        const ticketsRes = await client.query(`
            SELECT 
                tk.id, tk.amount, tk.net_lbs, tk.customer,
                s.name as stack_name,
                s.commodity,
                l.name as location_name
            FROM tickets tk
            LEFT JOIN stacks s ON s.id = tk.stack_id
            LEFT JOIN locations l ON l.id = tk.location_id
            WHERE tk.invoice_id = $1
            ORDER BY tk.created_at ASC
        `, [invoice.id]);

        return { ...invoice, tickets: ticketsRes.rows };
    } finally {
        client.release();
    }
}

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const invoice = await getInvoiceByToken(token);
    if (!invoice) notFound();

    const totalBales = invoice.tickets.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
    const totalNetLbs = invoice.tickets.reduce((sum: number, t: any) => sum + (parseFloat(t.net_lbs) || 0), 0);
    const hasPricing = invoice.price_per_unit && parseFloat(invoice.price_per_unit) > 0;
    const totalAmount = parseFloat(invoice.total_amount) || 0;
    const pricePerUnit = parseFloat(invoice.price_per_unit) || 0;

    const invoiceDate = new Date(invoice.created_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    const STATUS_LABELS: Record<string, { label: string; color: string }> = {
        draft: { label: 'Draft', color: '#f59e0b' },
        sent: { label: 'Awaiting Payment', color: '#3b82f6' },
        paid: { label: 'Paid', color: '#22c55e' },
    };
    const statusInfo = STATUS_LABELS[invoice.status] || STATUS_LABELS.draft;

    return (
        <div className="min-h-screen" style={{ background: 'var(--bg-deep)', color: 'var(--text-main)' }}>
            <div className="max-w-xl mx-auto px-4 py-8 space-y-6">

                {/* Print Button (hidden in print) */}
                <PrintButton />

                {/* Invoice Document */}
                <div className="glass-card space-y-5" id="invoice-content">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--accent)' }}>
                                INVOICE
                            </h1>
                            <p className="text-lg font-bold" style={{ color: 'var(--primary-light)' }}>
                                {invoice.invoice_number}
                            </p>
                        </div>
                        <div className="text-right">
                            <span
                                className="inline-block text-xs font-bold px-3 py-1 rounded-full uppercase mb-2"
                                style={{ background: `${statusInfo.color}22`, color: statusInfo.color }}
                            >
                                {statusInfo.label}
                            </span>
                            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                                {invoiceDate}
                            </p>
                        </div>
                    </div>

                    {/* Bill To */}
                    {invoice.customer && (
                        <div className="pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
                            <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-dim)' }}>Bill To</p>
                            <p className="text-lg font-semibold" style={{ color: 'var(--text-main)' }}>{invoice.customer}</p>
                        </div>
                    )}

                    {/* Line Items */}
                    <div>
                        <div className="grid grid-cols-12 gap-2 text-xs font-bold uppercase tracking-wider pb-2"
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
                                <div key={ticket.id} className="grid grid-cols-12 gap-2 py-3 items-center"
                                    style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                    <div className="col-span-5">
                                        <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                                            {ticket.stack_name}
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
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
                                            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>—</p>
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
                            );
                        })}
                    </div>

                    {/* Summary */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm" style={{ color: 'var(--text-dim)' }}>
                            <span>Total Bales</span>
                            <span className="font-medium">{totalBales.toLocaleString()}</span>
                        </div>
                        {totalNetLbs > 0 && (
                            <div className="flex justify-between text-sm" style={{ color: 'var(--text-dim)' }}>
                                <span>Total Weight</span>
                                <span className="font-medium">{totalNetLbs.toLocaleString()} lbs ({(totalNetLbs / 2000).toFixed(2)} tons)</span>
                            </div>
                        )}
                        {hasPricing && (
                            <div className="flex justify-between text-sm" style={{ color: 'var(--text-dim)' }}>
                                <span>Rate</span>
                                <span className="font-medium">${pricePerUnit.toFixed(2)} / {invoice.price_unit}</span>
                            </div>
                        )}

                        {/* Grand Total */}
                        {hasPricing && (
                            <div className="flex justify-between items-baseline pt-3 mt-1"
                                style={{ borderTop: '2px solid var(--glass-border)' }}>
                                <span className="text-sm font-bold uppercase" style={{ color: 'var(--text-dim)' }}>Total Due</span>
                                <span className="text-3xl font-bold" style={{ color: 'var(--primary-light)' }}>
                                    ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    {invoice.notes && (
                        <div className="pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
                            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Notes</p>
                            <p className="text-sm" style={{ color: 'var(--text-main)' }}>{invoice.notes}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-xs" style={{ color: 'var(--text-dim)' }}>
                    Powered by HayFlow
                </p>
            </div>
        </div>
    );
}
