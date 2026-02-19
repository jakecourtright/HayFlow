'use client';

import { createInvoice } from "@/app/actions";
import { useState } from "react";
import { Package, MapPin, FileText } from "lucide-react";

interface DispatchQueueProps {
    approvedTickets: any[];
}

export default function DispatchQueue({ approvedTickets }: DispatchQueueProps) {
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [customer, setCustomer] = useState('');
    const [notes, setNotes] = useState('');
    const [pricePerUnit, setPricePerUnit] = useState('');
    const [priceUnit, setPriceUnit] = useState('ton');
    const [error, setError] = useState('');
    const [showInvoiceForm, setShowInvoiceForm] = useState(false);

    function toggleTicket(id: number) {
        const next = new Set(selected);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelected(next);
    }

    function selectAll() {
        if (selected.size === approvedTickets.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(approvedTickets.map((t: any) => t.id)));
        }
    }

    // Calculate totals for selected tickets
    const selectedTickets = approvedTickets.filter((t: any) => selected.has(t.id));
    const totalBales = selectedTickets.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
    const totalNetLbs = selectedTickets.reduce((sum: number, t: any) => sum + (parseFloat(t.net_lbs) || 0), 0);
    const totalTons = totalNetLbs / 2000;

    // Calculate dollar total
    const price = parseFloat(pricePerUnit) || 0;
    const dollarTotal = priceUnit === 'ton'
        ? price * totalTons
        : price * totalBales;

    async function handleCreateInvoice() {
        if (selected.size === 0) return;

        const formData = new FormData();
        formData.set('ticketIds', Array.from(selected).join(','));
        formData.set('customer', customer);
        formData.set('notes', notes);
        formData.set('pricePerUnit', pricePerUnit);
        formData.set('priceUnit', priceUnit);

        try {
            setError('');
            await createInvoice(formData);
        } catch (e: any) {
            if (e?.digest?.startsWith('NEXT_REDIRECT')) {
                throw e;
            }
            setError(e.message || 'Failed to create invoice');
        }
    }

    if (approvedTickets.length === 0) return null;

    return (
        <div>
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-bold uppercase" style={{ color: '#22c55e' }}>
                    Ready to Invoice ({approvedTickets.length})
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={selectAll}
                        className="text-xs font-bold px-3 py-1 rounded-lg"
                        style={{ background: 'var(--bg-surface)', color: 'var(--text-dim)' }}
                    >
                        {selected.size === approvedTickets.length ? 'Deselect All' : 'Select All'}
                    </button>
                    {selected.size > 0 && (
                        <button
                            onClick={() => setShowInvoiceForm(!showInvoiceForm)}
                            className="text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1"
                            style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}
                        >
                            <FileText size={12} />
                            Invoice ({selected.size})
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="p-3 rounded-lg text-sm mb-3" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                    {error}
                </div>
            )}

            {/* Invoice Form */}
            {showInvoiceForm && selected.size > 0 && (
                <div className="glass-card mb-4 space-y-3" style={{ borderLeft: '3px solid #3b82f6' }}>
                    <h3 className="font-bold text-sm" style={{ color: '#3b82f6' }}>Create Invoice</h3>
                    <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-dim)' }}>Customer</label>
                        <input
                            type="text"
                            value={customer}
                            onChange={(e) => setCustomer(e.target.value)}
                            placeholder="Customer name"
                            className="input-field"
                        />
                    </div>

                    {/* Pricing */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-dim)' }}>Price Per</label>
                            <select
                                value={priceUnit}
                                onChange={(e) => setPriceUnit(e.target.value)}
                                className="input-field"
                            >
                                <option value="ton">$ / Ton</option>
                                <option value="bale">$ / Bale</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-dim)' }}>Amount</label>
                            <input
                                type="number"
                                value={pricePerUnit}
                                onChange={(e) => setPricePerUnit(e.target.value)}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                className="input-field"
                            />
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="p-3 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
                        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-dim)' }}>
                            <span>{selected.size} ticket{selected.size > 1 ? 's' : ''}</span>
                            <span>{totalBales.toLocaleString()} bales</span>
                        </div>
                        {totalNetLbs > 0 && (
                            <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-dim)' }}>
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
                            <p className="text-xs mt-1" style={{ color: '#f59e0b' }}>
                                ⚠ No net lbs on these tickets — total will be $0 when priced per ton
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-dim)' }}>Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            placeholder="Invoice notes (optional)"
                            className="input-field"
                        />
                    </div>
                    <button
                        onClick={handleCreateInvoice}
                        className="btn btn-primary w-full"
                    >
                        Create Invoice
                    </button>
                </div>
            )}

            {/* Ticket List with Checkboxes */}
            <div className="space-y-2">
                {approvedTickets.map((ticket: any) => (
                    <div
                        key={ticket.id}
                        onClick={() => toggleTicket(ticket.id)}
                        className="glass-card p-4 cursor-pointer transition-all"
                        style={{
                            borderLeft: selected.has(ticket.id) ? '3px solid #3b82f6' : '3px solid transparent',
                            opacity: selected.size > 0 && !selected.has(ticket.id) ? 0.6 : 1,
                        }}
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                                    style={{
                                        borderColor: selected.has(ticket.id) ? '#3b82f6' : 'var(--glass-border)',
                                        background: selected.has(ticket.id) ? '#3b82f6' : 'transparent',
                                    }}
                                >
                                    {selected.has(ticket.id) && (
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                            <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                    )}
                                </div>
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
                            </div>
                            <div className="text-right">
                                <span className="font-bold" style={{ color: 'var(--primary-light)' }}>
                                    {parseFloat(ticket.amount).toLocaleString()}
                                </span>
                                <span className="text-xs ml-1" style={{ color: 'var(--text-dim)' }}>bales</span>
                                {ticket.net_lbs && (
                                    <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                        {parseFloat(ticket.net_lbs).toLocaleString()} lbs
                                    </p>
                                )}
                            </div>
                        </div>
                        {ticket.customer && (
                            <p className="text-xs mt-1 ml-8" style={{ color: 'var(--text-dim)' }}>
                                → {ticket.customer}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
