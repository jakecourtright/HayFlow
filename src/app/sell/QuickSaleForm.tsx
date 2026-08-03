'use client';

import { quickSale } from "@/app/actions";
import { useState, useMemo, useRef } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import CustomSelect from "@/components/CustomSelect";
import { resolveWeight, LBS_PER_TON } from "@/lib/units";

interface QuickSaleFormProps {
    stacks: any[];
    locations: any[];
    inventory: any[];
}

interface Item {
    key: number;
    stackId: string;
    locationId: string;
    amount: string;
    netLbs: string;
    pricePerUnit: string;
    priceUnit: 'ton' | 'bale';
}

function newItem(key: number): Item {
    return { key, stackId: '', locationId: '', amount: '', netLbs: '', pricePerUnit: '', priceUnit: 'ton' };
}

export default function QuickSaleForm({ stacks, locations, inventory }: QuickSaleFormProps) {
    const keyRef = useRef(1);
    const [items, setItems] = useState<Item[]>([newItem(0)]);
    const [customer, setCustomer] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');

    const stackOptions = useMemo(
        () => stacks.map((s: any) => ({ value: s.id.toString(), label: `${s.name} — ${s.commodity}` })),
        [stacks]
    );

    // Locations that currently hold stock for the given stack
    function locationsForStack(stackId: string) {
        if (!stackId) return [];
        return inventory
            .filter((inv) => inv.stack_id.toString() === stackId && parseFloat(inv.quantity) > 0)
            .map((inv) => {
                const loc = locations.find((l: any) => l.id.toString() === inv.location_id.toString());
                return {
                    value: inv.location_id.toString(),
                    label: loc
                        ? `${loc.name} (${parseFloat(inv.quantity).toLocaleString()} bales)`
                        : `Location #${inv.location_id}`,
                };
            });
    }

    function updateItem(key: number, patch: Partial<Item>) {
        setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
    }
    function addItem() {
        setItems((prev) => [...prev, newItem(keyRef.current++)]);
    }
    function removeItem(key: number) {
        setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.key !== key) : prev));
    }

    function calcLine(it: Item) {
        const price = parseFloat(it.pricePerUnit) || 0;
        const bales = parseFloat(it.amount) || 0;
        const lbs = parseFloat(it.netLbs) || 0;
        if (price <= 0) return 0;
        if (it.priceUnit === 'bale') return price * bales;
        // No scale weight yet -> estimate from the stack's weight per bale (mirrors lib/units lineAmount)
        const stack = stacks.find((s: any) => s.id.toString() === it.stackId);
        const estWeight = stack ? resolveWeight(Number(stack.weight_per_bale) || null, stack.bale_size || '') : 0;
        const effectiveLbs = lbs > 0 ? lbs : bales * estWeight;
        return price * (effectiveLbs / LBS_PER_TON);
    }

    const grandTotal = items.reduce((sum, it) => sum + calcLine(it), 0);

    async function handleSubmit(formData: FormData) {
        try {
            setError('');
            if (!customer.trim()) throw new Error('Customer is required');
            for (let i = 0; i < items.length; i++) {
                const it = items[i];
                const n = i + 1;
                if (!it.stackId) throw new Error(`Item ${n}: choose a lot`);
                if (!it.locationId || it.locationId === 'none') throw new Error(`Item ${n}: choose a location`);
                const a = parseFloat(it.amount);
                if (isNaN(a) || a <= 0) throw new Error(`Item ${n}: enter the number of bales`);
            }
            formData.set('customer', customer.trim());
            formData.set('notes', notes);
            formData.set('items', JSON.stringify(items.map((it) => ({
                stackId: it.stackId,
                locationId: it.locationId,
                amount: it.amount,
                netLbs: it.netLbs,
                pricePerUnit: it.pricePerUnit,
                priceUnit: it.priceUnit,
            }))));
            await quickSale(formData);
        } catch (e: any) {
            if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e;
            setError(e.message || 'Failed to create sale');
        }
    }

    return (
        <div className="space-y-4">
            <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm"
                style={{ color: 'var(--text-dim)' }}
            >
                <ArrowLeft size={16} /> Back to Dashboard
            </Link>

            {error && (
                <div role="alert" className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                    {error}
                </div>
            )}

            <form action={handleSubmit} className="space-y-4">
                {/* Customer (shared across the whole invoice) */}
                <div className="glass-card">
                    <label className="label-modern">Customer *</label>
                    <input
                        type="text"
                        value={customer}
                        onChange={(e) => setCustomer(e.target.value)}
                        placeholder="Customer name"
                        className="input-modern"
                    />
                </div>

                {/* Line items */}
                {items.map((it, idx) => {
                    const locs = locationsForStack(it.stackId);
                    const lineTotal = calcLine(it);
                    const priced = parseFloat(it.pricePerUnit) > 0;
                    return (
                        <div key={it.key} className="glass-card space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="font-bold text-sm" style={{ color: 'var(--accent)' }}>Item {idx + 1}</p>
                                {items.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeItem(it.key)}
                                        className="icon-button"
                                        aria-label={`Remove item ${idx + 1}`}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>

                            {/* Stack */}
                            <div>
                                <label className="label-modern">Lot (Stack)</label>
                                <CustomSelect
                                    name={`stackId-${it.key}`}
                                    options={stackOptions}
                                    value={it.stackId}
                                    onChange={(v) => updateItem(it.key, { stackId: v, locationId: '' })}
                                    placeholder="Select lot..."
                                />
                            </div>

                            {/* Location */}
                            <div>
                                <label className="label-modern">Location</label>
                                {it.stackId ? (
                                    locs.length > 0 ? (
                                        <CustomSelect
                                            name={`locationId-${it.key}`}
                                            options={locs}
                                            value={it.locationId}
                                            onChange={(v) => updateItem(it.key, { locationId: v })}
                                            placeholder="Select location..."
                                        />
                                    ) : (
                                        <p className="text-sm" style={{ color: '#f59e0b' }}>No stock at any location for this lot</p>
                                    )
                                ) : (
                                    <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Select a lot first</p>
                                )}
                            </div>

                            {/* Bales + Net Lbs */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="label-modern">Bales</label>
                                    <input
                                        type="number"
                                        value={it.amount}
                                        onChange={(e) => updateItem(it.key, { amount: e.target.value })}
                                        placeholder="Number of bales"
                                        min="1"
                                        className="input-modern"
                                    />
                                </div>
                                <div>
                                    <label className="label-modern">Net Lbs</label>
                                    <input
                                        type="number"
                                        value={it.netLbs}
                                        onChange={(e) => updateItem(it.key, { netLbs: e.target.value })}
                                        placeholder="Scale weight"
                                        min="0"
                                        className="input-modern"
                                    />
                                </div>
                            </div>

                            {/* Pricing */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="label-modern">Price Per</label>
                                    <select
                                        value={it.priceUnit}
                                        onChange={(e) => updateItem(it.key, { priceUnit: e.target.value as 'ton' | 'bale' })}
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
                                        value={it.pricePerUnit}
                                        onChange={(e) => updateItem(it.key, { pricePerUnit: e.target.value })}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                        className="input-modern"
                                    />
                                </div>
                            </div>

                            {priced && (
                                <div className="flex justify-between text-sm pt-1" style={{ color: 'var(--text-dim)' }}>
                                    <span>Line total</span>
                                    <span className="font-medium">
                                        ${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}
                            {priced && it.priceUnit === 'ton' && !(parseFloat(it.netLbs) > 0) && (
                                <p className="text-xs" style={{ color: '#f59e0b' }}>
                                    ⚠ Total estimated from bale weight — enter net lbs from the scale for an exact total
                                </p>
                            )}
                        </div>
                    );
                })}

                <button
                    type="button"
                    onClick={addItem}
                    className="btn btn-secondary w-full flex items-center justify-center gap-2"
                >
                    <Plus size={16} /> Add another item
                </button>

                {/* Grand total */}
                {grandTotal > 0 && (
                    <div className="glass-card">
                        <div className="flex justify-between items-baseline">
                            <span className="text-eyebrow">Invoice total</span>
                            <span className="text-display-md" style={{ color: 'var(--primary-light)' }}>
                                ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                )}

                {/* Notes (shared) */}
                <div className="glass-card">
                    <label className="label-modern">Notes</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        placeholder="Optional notes for the invoice"
                        className="input-modern"
                    />
                </div>

                <button type="submit" className="btn btn-primary w-full">
                    Create Sale & Invoice
                </button>
            </form>
        </div>
    );
}
