'use client';

import { updateInvoice } from "@/app/actions";
import { useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import SubmitButton from "@/components/ui/SubmitButton";

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
    const dollarTotal = priceUnit === 'ton' ? price * totalTons : price * totalBales;

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
        <form action={handleSubmit} className="surface-card space-y-4">
            {error && (
                <div role="alert" className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'color-mix(in srgb, var(--error) 14%, transparent)', color: 'var(--error)' }}>
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <div>
                <label className="label-modern" htmlFor="edit-customer">Customer</label>
                <input
                    id="edit-customer"
                    type="text"
                    name="customer"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    placeholder="Customer name"
                    className="input-modern"
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="label-modern" htmlFor="edit-price-unit">Price per</label>
                    <select
                        id="edit-price-unit"
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
                    <label className="label-modern" htmlFor="edit-price">Amount</label>
                    <input
                        id="edit-price"
                        type="number"
                        name="pricePerUnit"
                        value={pricePerUnit}
                        onChange={(e) => setPricePerUnit(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        className="input-modern"
                    />
                </div>
            </div>

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
                    <div className="flex items-start gap-2 text-xs mt-2 pt-2" style={{ borderTop: '1px solid var(--glass-border)', color: 'var(--warning)' }}>
                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                        <span>No net lbs on tickets — total will be $0 when priced per ton.</span>
                    </div>
                )}
            </div>

            <div>
                <label className="label-modern" htmlFor="edit-notes">Notes</label>
                <textarea
                    id="edit-notes"
                    name="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Invoice notes (optional)"
                    className="input-modern"
                />
            </div>

            <div className="flex gap-3">
                <SubmitButton className="flex-1" pendingLabel="Saving…">
                    Save changes
                </SubmitButton>
                <Link
                    href={`/dispatch/invoices/${invoice.id}`}
                    className="btn btn-secondary flex items-center justify-center"
                >
                    Cancel
                </Link>
            </div>
        </form>
    );
}
