'use client';

import { updateInvoice } from "@/app/actions";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface InvoiceEditFormProps {
    invoice: any;
    totalBales: number;
    totalNetLbs: number;
}

export default function InvoiceEditForm({ invoice, totalBales, totalNetLbs }: InvoiceEditFormProps) {
    const [customer, setCustomer] = useState(invoice.customer || '');
    const [notes, setNotes] = useState(invoice.notes || '');
    const [pricePerUnit, setPricePerUnit] = useState(
        invoice.price_per_unit ? parseFloat(invoice.price_per_unit).toString() : ''
    );
    const [priceUnit, setPriceUnit] = useState(invoice.price_unit || 'ton');
    const [error, setError] = useState('');

    const price = parseFloat(pricePerUnit) || 0;
    const totalTons = totalNetLbs / 2000;
    const dollarTotal = priceUnit === 'ton'
        ? price * totalTons
        : price * totalBales;

    async function handleSubmit(formData: FormData) {
        try {
            setError('');
            await updateInvoice(invoice.id.toString(), formData);
        } catch (e: any) {
            if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e;
            setError(e.message || 'Failed to update invoice');
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <Link
                    href={`/dispatch/invoices/${invoice.id}`}
                    className="p-2 rounded-xl transition-colors"
                    style={{ background: 'var(--bg-surface)' }}
                >
                    <ArrowLeft size={20} style={{ color: 'var(--text-dim)' }} />
                </Link>
                <h1 className="text-xl font-bold" style={{ color: 'var(--accent)' }}>
                    Edit {invoice.invoice_number}
                </h1>
            </div>

            {error && (
                <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                    {error}
                </div>
            )}

            <form action={handleSubmit} className="glass-card space-y-4">
                <div>
                    <label className="label-modern">Customer</label>
                    <input
                        type="text"
                        name="customer"
                        value={customer}
                        onChange={(e) => setCustomer(e.target.value)}
                        placeholder="Customer name"
                        className="input-modern"
                    />
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="label-modern">Price Per</label>
                        <select
                            name="priceUnit"
                            value={priceUnit}
                            onChange={(e) => setPriceUnit(e.target.value)}
                            className="select-modern"
                        >
                            <option value="ton">$ / Ton</option>
                            <option value="bale">$ / Bale</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-modern">Amount</label>
                        <input
                            type="number"
                            name="pricePerUnit"
                            value={pricePerUnit}
                            onChange={(e) => setPricePerUnit(e.target.value)}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            className="input-modern"
                        />
                    </div>
                </div>

                {/* Live Preview */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
                    <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-dim)' }}>
                        <span>{totalBales.toLocaleString()} bales</span>
                        {totalNetLbs > 0 && <span>{totalTons.toFixed(2)} tons</span>}
                    </div>
                    {price > 0 && (
                        <div className="flex justify-between text-sm font-bold mt-2 pt-2" style={{ borderTop: '1px solid var(--glass-border)', color: 'var(--primary-light)' }}>
                            <span>Total</span>
                            <span>${dollarTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    )}
                    {priceUnit === 'ton' && totalNetLbs === 0 && price > 0 && (
                        <p className="text-xs mt-1" style={{ color: '#f59e0b' }}>
                            ⚠ No net lbs on tickets — total will be $0 when priced per ton
                        </p>
                    )}
                </div>

                <div>
                    <label className="label-modern">Notes</label>
                    <textarea
                        name="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Invoice notes (optional)"
                        className="input-modern"
                    />
                </div>

                <div className="flex gap-3">
                    <button type="submit" className="btn btn-primary flex-1">
                        Save Changes
                    </button>
                    <Link
                        href={`/dispatch/invoices/${invoice.id}`}
                        className="btn btn-secondary flex items-center justify-center"
                        style={{ background: 'var(--bg-surface)' }}
                    >
                        Cancel
                    </Link>
                </div>
            </form>
        </div>
    );
}
