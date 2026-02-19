'use client';

import { quickSale } from "@/app/actions";
import { useState, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import CustomSelect from "@/components/CustomSelect";

interface QuickSaleFormProps {
    stacks: any[];
    locations: any[];
    inventory: any[];
}

export default function QuickSaleForm({ stacks, locations, inventory }: QuickSaleFormProps) {
    const [stackId, setStackId] = useState('');
    const [locationId, setLocationId] = useState('');
    const [amount, setAmount] = useState('');
    const [customer, setCustomer] = useState('');
    const [netLbs, setNetLbs] = useState('');
    const [notes, setNotes] = useState('');
    const [pricePerUnit, setPricePerUnit] = useState('');
    const [priceUnit, setPriceUnit] = useState('ton');
    const [error, setError] = useState('');

    // Locations that have stock for selected stack
    const availableLocations = useMemo(() => {
        if (!stackId) return [];
        return inventory
            .filter(inv => inv.stack_id.toString() === stackId && parseFloat(inv.quantity) > 0)
            .map(inv => {
                const loc = locations.find((l: any) => l.id.toString() === inv.location_id.toString());
                return {
                    value: inv.location_id.toString(),
                    label: loc ? `${loc.name} (${parseFloat(inv.quantity).toLocaleString()} bales)` : `Location #${inv.location_id}`,
                };
            });
    }, [stackId, inventory, locations]);

    // Calculate dollar total
    const price = parseFloat(pricePerUnit) || 0;
    const bales = parseFloat(amount) || 0;
    const lbs = parseFloat(netLbs) || 0;
    const dollarTotal = priceUnit === 'ton'
        ? price * (lbs / 2000)
        : price * bales;

    async function handleSubmit(formData: FormData) {
        try {
            setError('');
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
                <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                    {error}
                </div>
            )}

            <form action={handleSubmit} className="glass-card space-y-4">
                {/* Stack */}
                <div>
                    <label className="label-modern">Lot (Stack)</label>
                    <CustomSelect
                        name="stackId"
                        options={stacks.map((s: any) => ({
                            value: s.id.toString(),
                            label: `${s.name} — ${s.commodity}`,
                        }))}
                        value={stackId}
                        onChange={(v) => { setStackId(v); setLocationId(''); }}
                        placeholder="Select lot..."
                        required
                    />
                </div>

                {/* Location */}
                <div>
                    <label className="label-modern">Location</label>
                    {stackId ? (
                        availableLocations.length > 0 ? (
                            <CustomSelect
                                name="locationId"
                                options={availableLocations}
                                value={locationId}
                                onChange={setLocationId}
                                placeholder="Select location..."
                                required
                            />
                        ) : (
                            <>
                                <input type="hidden" name="locationId" value="none" />
                                <p className="text-sm" style={{ color: '#f59e0b' }}>No stock at any location for this lot</p>
                            </>
                        )
                    ) : (
                        <>
                            <input type="hidden" name="locationId" value="" />
                            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Select a lot first</p>
                        </>
                    )}
                </div>

                {/* Customer */}
                <div>
                    <label className="label-modern">Customer *</label>
                    <input
                        type="text"
                        name="customer"
                        value={customer}
                        onChange={(e) => setCustomer(e.target.value)}
                        placeholder="Customer name"
                        required
                        className="input-modern"
                    />
                </div>

                {/* Amount (bales) */}
                <div>
                    <label className="label-modern">Bales</label>
                    <input
                        type="number"
                        name="amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Number of bales"
                        min="1"
                        required
                        className="input-modern"
                    />
                </div>

                {/* Net Lbs */}
                <div>
                    <label className="label-modern">Net Lbs (scale weight)</label>
                    <input
                        type="number"
                        name="netLbs"
                        value={netLbs}
                        onChange={(e) => setNetLbs(e.target.value)}
                        placeholder="Net weight in pounds"
                        min="0"
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

                {/* Live Total Preview */}
                {price > 0 && (
                    <div className="p-3 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
                        <div className="flex justify-between text-sm font-bold" style={{ color: 'var(--primary-light)' }}>
                            <span>Invoice Total</span>
                            <span>${dollarTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        {priceUnit === 'ton' && lbs === 0 && (
                            <p className="text-xs mt-1" style={{ color: '#f59e0b' }}>
                                ⚠ Enter net lbs for an accurate total when pricing per ton
                            </p>
                        )}
                    </div>
                )}

                {/* Notes */}
                <div>
                    <label className="label-modern">Notes</label>
                    <textarea
                        name="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        placeholder="Optional notes"
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
