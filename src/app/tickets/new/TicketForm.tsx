'use client';

import { createTicket } from "@/app/actions";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface TicketFormProps {
    stacks: any[];
    locations: any[];
    inventory: any[];
}

export default function TicketForm({ stacks, locations, inventory }: TicketFormProps) {
    const [selectedStack, setSelectedStack] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('');
    const [error, setError] = useState('');

    // Get available stock for selected stack/location
    const availableStock = inventory.find(
        (inv: any) =>
            inv.stack_id?.toString() === selectedStack &&
            inv.location_id?.toString() === selectedLocation
    );

    // Locations with stock for selected stack
    const locationsWithStock = selectedStack
        ? inventory
            .filter((inv: any) => inv.stack_id?.toString() === selectedStack && parseFloat(inv.quantity) > 0)
            .map((inv: any) => inv.location_id?.toString())
        : [];

    async function handleSubmit(formData: FormData) {
        try {
            setError('');
            await createTicket(formData);
        } catch (e: any) {
            setError(e.message || 'Failed to create ticket');
        }
    }

    return (
        <div className="space-y-4">
            <Link href="/tickets" className="flex items-center gap-2 text-sm mb-4" style={{ color: 'var(--text-dim)' }}>
                <ArrowLeft size={16} />
                Back to Tickets
            </Link>

            {error && (
                <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                    {error}
                </div>
            )}

            <form action={handleSubmit} className="glass-card space-y-4">
                {/* Stack Selection */}
                <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-dim)' }}>
                        Product (Stack) *
                    </label>
                    <select
                        name="stackId"
                        required
                        value={selectedStack}
                        onChange={(e) => {
                            setSelectedStack(e.target.value);
                            setSelectedLocation('');
                        }}
                        className="input-field"
                    >
                        <option value="">Select a stack...</option>
                        {stacks.map((s: any) => (
                            <option key={s.id} value={s.id}>
                                {s.name} — {s.commodity}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Location Selection */}
                <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-dim)' }}>
                        Pick-up Location *
                    </label>
                    <select
                        name="locationId"
                        required
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        className="input-field"
                    >
                        <option value="">Select location...</option>
                        {locations.map((l: any) => {
                            const hasStock = locationsWithStock.includes(l.id.toString());
                            return (
                                <option key={l.id} value={l.id} disabled={selectedStack ? !hasStock : false}>
                                    {l.name}{selectedStack && !hasStock ? ' (no stock)' : ''}
                                </option>
                            );
                        })}
                    </select>
                    {availableStock && (
                        <p className="text-xs mt-1" style={{ color: 'var(--primary-light)' }}>
                            Available: {parseFloat(availableStock.quantity).toLocaleString()} bales
                        </p>
                    )}
                </div>

                {/* Amount */}
                <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-dim)' }}>
                        Bales *
                    </label>
                    <input
                        type="number"
                        name="amount"
                        required
                        min="1"
                        step="1"
                        placeholder="Number of bales"
                        className="input-field"
                    />
                </div>

                {/* Customer */}
                <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-dim)' }}>
                        Customer
                    </label>
                    <input
                        type="text"
                        name="customer"
                        placeholder="Customer name (optional)"
                        className="input-field"
                    />
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-dim)' }}>
                        Notes
                    </label>
                    <textarea
                        name="notes"
                        rows={3}
                        placeholder="Delivery notes, truck #, etc. (optional)"
                        className="input-field"
                    />
                </div>

                <button type="submit" className="btn btn-primary w-full">
                    Create Ticket
                </button>
            </form>
        </div>
    );
}
