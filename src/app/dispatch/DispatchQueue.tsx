'use client';

import { createInvoice } from "@/app/actions";
import { useState } from "react";
import { FileText, AlertCircle, Check } from "lucide-react";
import SubmitButton from "@/components/ui/SubmitButton";
import { useToast } from "@/components/ui/Toast";

interface DispatchQueueProps {
    approvedTickets: any[];
}

export default function DispatchQueue({ approvedTickets }: DispatchQueueProps) {
    const toast = useToast();
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [customer, setCustomer] = useState('');
    const [notes, setNotes] = useState('');
    const [pricePerUnit, setPricePerUnit] = useState('');
    const [priceUnit, setPriceUnit] = useState('ton');
    const [error, setError] = useState('');
    const [showInvoiceForm, setShowInvoiceForm] = useState(false);

    function toggleTicket(id: number) {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelected(next);
    }

    function selectAll() {
        if (selected.size === approvedTickets.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(approvedTickets.map((t: any) => t.id)));
        }
    }

    const selectedTickets = approvedTickets.filter((t: any) => selected.has(t.id));
    const totalBales = selectedTickets.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
    const totalNetLbs = selectedTickets.reduce((sum: number, t: any) => sum + (parseFloat(t.net_lbs) || 0), 0);
    const totalTons = totalNetLbs / 2000;

    const price = parseFloat(pricePerUnit) || 0;
    const dollarTotal = priceUnit === 'ton' ? price * totalTons : price * totalBales;

    async function handleCreateInvoice(formData: FormData) {
        if (selected.size === 0) return;

        formData.set('ticketIds', Array.from(selected).join(','));
        formData.set('customer', customer);
        formData.set('notes', notes);
        formData.set('pricePerUnit', pricePerUnit);
        formData.set('priceUnit', priceUnit);

        try {
            setError('');
            await createInvoice(formData);
        } catch (e: any) {
            if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e;
            const msg = e.message || 'Failed to create invoice';
            setError(msg);
            toast.show(msg, 'error');
        }
    }

    if (approvedTickets.length === 0) return null;

    return (
        <section>
            <div className="flex justify-between items-center mb-3 gap-2">
                <h2 className="text-eyebrow" style={{ color: 'var(--success)' }}>
                    Ready to invoice ({approvedTickets.length})
                </h2>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={selectAll}
                        className="btn btn-secondary btn-sm"
                    >
                        {selected.size === approvedTickets.length ? 'Deselect all' : 'Select all'}
                    </button>
                    {selected.size > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowInvoiceForm(!showInvoiceForm)}
                            className="btn btn-primary btn-sm"
                            aria-expanded={showInvoiceForm}
                        >
                            <FileText size={14} />
                            Invoice ({selected.size})
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div role="alert" className="surface-card mb-3 flex items-start gap-2 p-3" style={{ borderColor: 'var(--error)', color: 'var(--error)' }}>
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {showInvoiceForm && selected.size > 0 && (
                <form action={handleCreateInvoice} className="surface-card mb-4 space-y-4" style={{ borderLeft: '3px solid var(--primary)' }}>
                    <h3 className="text-eyebrow" style={{ color: 'var(--primary-light)' }}>Create invoice</h3>
                    <div>
                        <label className="label-modern" htmlFor="dispatch-customer">Customer</label>
                        <input
                            id="dispatch-customer"
                            type="text"
                            value={customer}
                            onChange={(e) => setCustomer(e.target.value)}
                            placeholder="Customer name"
                            className="input-modern"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label-modern" htmlFor="dispatch-price-unit">Price per</label>
                            <select
                                id="dispatch-price-unit"
                                value={priceUnit}
                                onChange={(e) => setPriceUnit(e.target.value)}
                                className="select-modern"
                            >
                                <option value="ton">$ / Ton</option>
                                <option value="bale">$ / Bale</option>
                            </select>
                        </div>
                        <div>
                            <label className="label-modern" htmlFor="dispatch-price">Amount</label>
                            <input
                                id="dispatch-price"
                                type="number"
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

                    <div className="p-3 rounded-lg space-y-1" style={{ background: 'var(--bg-surface)' }}>
                        <div className="flex justify-between text-xs" style={{ color: 'var(--text-dim)' }}>
                            <span>{selected.size} ticket{selected.size > 1 ? 's' : ''}</span>
                            <span>{totalBales.toLocaleString()} bales</span>
                        </div>
                        {totalNetLbs > 0 && (
                            <div className="flex justify-between text-xs" style={{ color: 'var(--text-dim)' }}>
                                <span>Net weight</span>
                                <span>{totalNetLbs.toLocaleString()} lbs ({totalTons.toFixed(2)} tons)</span>
                            </div>
                        )}
                        {price > 0 && (
                            <div className="flex justify-between text-sm font-bold mt-2 pt-2" style={{ borderTop: '1px solid var(--glass-border)', color: 'var(--primary-light)' }}>
                                <span>Total</span>
                                <span>${dollarTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        {priceUnit === 'ton' && totalNetLbs === 0 && price > 0 && (
                            <div className="flex items-start gap-2 text-xs mt-2 pt-2" style={{ borderTop: '1px solid var(--glass-border)', color: 'var(--warning)' }}>
                                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                <span>No net lbs on these tickets — total will be $0 when priced per ton.</span>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="label-modern" htmlFor="dispatch-notes">Notes</label>
                        <textarea
                            id="dispatch-notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            placeholder="Invoice notes (optional)"
                            className="input-modern"
                        />
                    </div>
                    <SubmitButton className="w-full" pendingLabel="Creating invoice…">
                        Create invoice
                    </SubmitButton>
                </form>
            )}

            <ul className="space-y-2" role="list">
                {approvedTickets.map((ticket: any) => {
                    const isSelected = selected.has(ticket.id);
                    const dimmed = selected.size > 0 && !isSelected;
                    return (
                        <li key={ticket.id}>
                            <button
                                type="button"
                                onClick={() => toggleTicket(ticket.id)}
                                aria-pressed={isSelected}
                                className="glass-card w-full text-left p-4 transition-all"
                                style={{
                                    borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
                                    opacity: dimmed ? 0.6 : 1,
                                }}
                            >
                                <div className="flex justify-between items-center gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span
                                            aria-hidden
                                            className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors"
                                            style={{
                                                borderColor: isSelected ? 'var(--primary)' : 'var(--glass-border)',
                                                background: isSelected ? 'var(--primary)' : 'transparent',
                                            }}
                                        >
                                            {isSelected && <Check size={12} strokeWidth={3} color="white" />}
                                        </span>
                                        <div className="min-w-0">
                                            <div className="flex items-baseline gap-2 flex-wrap">
                                                <span className="font-bold" style={{ color: 'var(--accent)' }}>
                                                    #{ticket.id}
                                                </span>
                                                <span className="text-sm truncate" style={{ color: 'var(--text)' }}>
                                                    {ticket.stack_name}
                                                </span>
                                            </div>
                                            {ticket.customer && (
                                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                                                    → {ticket.customer}
                                                </p>
                                            )}
                                            {ticket.location_name && (
                                                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                                    @ {ticket.location_name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="font-bold" style={{ color: 'var(--primary-light)' }}>
                                            {parseFloat(ticket.amount).toLocaleString()}
                                        </div>
                                        <div className="text-xs" style={{ color: 'var(--text-dim)' }}>bales</div>
                                        {ticket.net_lbs && (
                                            <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                                {parseFloat(ticket.net_lbs).toLocaleString()} lbs
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
