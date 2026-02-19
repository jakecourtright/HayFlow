import pool from "@/lib/db";
import { notFound } from "next/navigation";
import { Scale } from "lucide-react";

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

    const STATUS_LABELS: Record<string, string> = {
        draft: 'Draft',
        sent: 'Sent',
        paid: 'Paid',
    };

    return (
        <div className="min-h-screen" style={{ background: 'var(--bg-deep)', color: 'var(--text-main)' }}>
            <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-3xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--accent)' }}>
                        {invoice.invoice_number}
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                        {new Date(invoice.created_at).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'long', day: 'numeric'
                        })}
                    </p>
                    <span
                        className="inline-block text-xs font-bold px-3 py-1 rounded-full uppercase mt-2"
                        style={{
                            background: invoice.status === 'paid' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                            color: invoice.status === 'paid' ? '#22c55e' : '#f59e0b',
                        }}
                    >
                        {STATUS_LABELS[invoice.status] || invoice.status}
                    </span>
                </div>

                {/* Customer & Summary */}
                <div className="glass-card">
                    {invoice.customer && (
                        <div className="mb-4">
                            <p className="text-xs uppercase font-bold tracking-wider" style={{ color: 'var(--text-dim)' }}>Bill To</p>
                            <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{invoice.customer}</p>
                        </div>
                    )}

                    {/* Line Items */}
                    <div className="mb-4">
                        <p className="text-xs uppercase font-bold tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>Items</p>
                        <div className="space-y-2">
                            {invoice.tickets.map((ticket: any) => (
                                <div key={ticket.id} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                    <div>
                                        <p className="font-medium text-sm" style={{ color: 'var(--text-main)' }}>
                                            {ticket.stack_name}{ticket.commodity ? ` — ${ticket.commodity}` : ''}
                                        </p>
                                        {ticket.location_name && (
                                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>@ {ticket.location_name}</p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold" style={{ color: 'var(--primary-light)' }}>
                                            {parseFloat(ticket.amount).toLocaleString()} bales
                                        </p>
                                        {ticket.net_lbs && (
                                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                                {parseFloat(ticket.net_lbs).toLocaleString()} lbs
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="pt-3 space-y-2" style={{ borderTop: '2px solid var(--glass-border)' }}>
                        <div className="flex justify-between text-sm" style={{ color: 'var(--text-dim)' }}>
                            <span>Total Bales</span>
                            <span className="font-bold">{totalBales.toLocaleString()}</span>
                        </div>
                        {totalNetLbs > 0 && (
                            <div className="flex justify-between text-sm" style={{ color: 'var(--text-dim)' }}>
                                <span>Net Weight</span>
                                <span className="font-bold">{totalNetLbs.toLocaleString()} lbs ({(totalNetLbs / 2000).toFixed(2)} tons)</span>
                            </div>
                        )}
                        {hasPricing && (
                            <>
                                <div className="flex justify-between text-sm" style={{ color: 'var(--text-dim)' }}>
                                    <span>Rate</span>
                                    <span className="font-bold">${parseFloat(invoice.price_per_unit).toFixed(2)} / {invoice.price_unit}</span>
                                </div>
                                <div className="flex justify-between items-baseline pt-2 mt-2" style={{ borderTop: '1px solid var(--glass-border)' }}>
                                    <span className="font-bold text-sm" style={{ color: 'var(--text-dim)' }}>Total Due</span>
                                    <span className="text-2xl font-bold" style={{ color: 'var(--primary-light)' }}>
                                        ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    {invoice.notes && (
                        <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
                            <p className="text-xs uppercase font-bold tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Notes</p>
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
