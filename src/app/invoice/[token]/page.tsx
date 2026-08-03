import pool from "@/lib/db";
import { notFound } from "next/navigation";
import PrintButton from "@/components/ui/PrintButton";
import StatusChip from "@/components/ui/StatusChip";
import InvoiceFromBlock from "@/components/ui/InvoiceFromBlock";
import { getBusinessProfileByOrg } from "@/app/actions";
import { resolveLineRate, lineAmount, resolveWeight } from "@/lib/units";

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
                tk.price_per_unit, tk.price_unit,
                s.name as stack_name,
                s.commodity,
                s.weight_per_bale as stack_weight_per_bale,
                s.bale_size as stack_bale_size,
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

    const businessProfile = await getBusinessProfileByOrg(invoice.org_id);

    const totalBales = invoice.tickets.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
    const totalNetLbs = invoice.tickets.reduce((sum: number, t: any) => sum + (parseFloat(t.net_lbs) || 0), 0);

    // Each line uses its own rate when set (Quick Sale multi-item), else the invoice rate.
    const lines = invoice.tickets.map((t: any) => {
        const { rate, unit } = resolveLineRate(t.price_per_unit, t.price_unit, invoice.price_per_unit, invoice.price_unit);
        const estWeight = resolveWeight(Number(t.stack_weight_per_bale) || null, t.stack_bale_size || '');
        return { rate, unit, amount: lineAmount(parseFloat(t.amount), parseFloat(t.net_lbs) || 0, rate, unit, estWeight) };
    });
    const totalAmount = lines.reduce((sum: number, l: any) => sum + l.amount, 0);
    const hasPricing = totalAmount > 0 || lines.some((l: any) => l.rate > 0);
    const pricedRates = new Set(lines.filter((l: any) => l.rate > 0).map((l: any) => `${l.rate}|${l.unit}`));
    const uniformRate = pricedRates.size === 1 ? lines.find((l: any) => l.rate > 0) : null;

    const invoiceDate = new Date(invoice.created_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <div className="min-h-screen" style={{ background: 'var(--bg-deep)', color: 'var(--text-main)' }}>
            <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
                <div className="flex justify-end">
                    <PrintButton />
                </div>

                <article className="glass-card space-y-5" id="invoice-content">
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <p className="text-display-sm" style={{ color: 'var(--accent)' }}>
                                Invoice
                            </p>
                            <p className="text-lg font-bold" style={{ color: 'var(--primary-light)' }}>
                                {invoice.invoice_number}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="mb-2 flex justify-end">
                                <StatusChip status={invoice.status} />
                            </div>
                            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                                {invoiceDate}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
                        <InvoiceFromBlock profile={businessProfile} />
                        {invoice.customer && (
                            <div className={businessProfile?.name ? 'sm:text-right' : ''}>
                                <p className="text-eyebrow mb-0.5">Bill to</p>
                                <p className="text-lg font-semibold" style={{ color: 'var(--text-main)' }}>{invoice.customer}</p>
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="grid grid-cols-12 gap-2 text-xs font-bold uppercase tracking-wider pb-2"
                            style={{ color: 'var(--text-dim)', borderBottom: '2px solid var(--glass-border)' }}>
                            <div className="col-span-5">Description</div>
                            <div className="col-span-2 text-right">Qty</div>
                            <div className="col-span-2 text-right">Weight</div>
                            {hasPricing && <div className="col-span-3 text-right">Amount</div>}
                        </div>

                        {invoice.tickets.map((ticket: any, idx: number) => {
                            const ticketNetLbs = parseFloat(ticket.net_lbs) || 0;
                            const ticketBales = parseFloat(ticket.amount);
                            const line = lines[idx];

                            return (
                                <div key={ticket.id} className="grid grid-cols-12 gap-2 py-3 items-center"
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
                                            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>—</p>
                                        )}
                                    </div>
                                    {hasPricing && (
                                        <div className="col-span-3 text-right">
                                            <p className="text-sm font-bold" style={{ color: 'var(--primary-light)' }}>
                                                ${line.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                            {line.rate > 0 && (
                                                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                                    @ ${line.rate.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}/{line.unit}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="space-y-2">
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
                        {uniformRate && (
                            <div className="flex justify-between text-sm" style={{ color: 'var(--text-dim)' }}>
                                <span>Rate</span>
                                <span className="font-medium">${uniformRate.rate.toFixed(2)} / {uniformRate.unit}</span>
                            </div>
                        )}

                        {hasPricing && (
                            <div className="flex justify-between items-baseline pt-3 mt-1"
                                style={{ borderTop: '2px solid var(--glass-border)' }}>
                                <span className="text-eyebrow">Total due</span>
                                <span className="text-display-lg" style={{ color: 'var(--primary-light)' }}>
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

                    {businessProfile?.payment_instructions && (
                        <div className="pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
                            <p className="text-eyebrow mb-1">Payment instructions</p>
                            <p className="text-sm whitespace-pre-line" style={{ color: 'var(--text-main)' }}>
                                {businessProfile.payment_instructions}
                            </p>
                        </div>
                    )}
                </article>

                <p className="text-center text-xs" style={{ color: 'var(--text-dim)' }}>
                    Powered by HayFlow
                </p>
            </div>
        </div>
    );
}
