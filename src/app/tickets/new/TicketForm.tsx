'use client';

import { createTicket } from "@/app/actions";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import CustomSelect from "@/components/CustomSelect";

interface TicketFormProps {
    stacks: any[];
    locations: any[];
    inventory: any[];
}

const TICKET_TYPES = [
    { value: 'sale', label: 'Sale' },
    { value: 'barn_to_barn', label: 'Barn to Barn' },
];

export default function TicketForm({ stacks, locations, inventory }: TicketFormProps) {
    const [ticketType, setTicketType] = useState('sale');
    const [selectedStack, setSelectedStack] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('');
    const [selectedDestination, setSelectedDestination] = useState('');
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

    // Build options for stack select
    const stackOptions = stacks.map((s: any) => ({
        value: s.id.toString(),
        label: `${s.name} — ${s.commodity}`,
    }));

    // Build options for source location (with disabled for no-stock)
    const locationOptions = locations.map((l: any) => {
        const hasStock = locationsWithStock.includes(l.id.toString());
        return {
            value: l.id.toString(),
            label: `${l.name}${selectedStack && !hasStock ? ' (no stock)' : ''}`,
            disabled: selectedStack ? !hasStock : false,
        };
    });

    // Build options for destination (exclude source location)
    const destinationOptions = locations
        .filter((l: any) => l.id.toString() !== selectedLocation)
        .map((l: any) => ({
            value: l.id.toString(),
            label: l.name,
        }));

    async function handleSubmit(formData: FormData) {
        try {
            setError('');
            await createTicket(formData);
        } catch (e: any) {
            // Next.js redirect() works by throwing – let it propagate
            if (e?.digest?.startsWith('NEXT_REDIRECT')) {
                throw e;
            }
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
                {/* Ticket Type Selector */}
                <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-dim)' }}>
                        Ticket Type *
                    </label>
                    <CustomSelect
                        name="type"
                        value={ticketType}
                        onChange={(val) => {
                            setTicketType(val);
                            setSelectedDestination('');
                        }}
                        options={TICKET_TYPES}
                    />
                </div>

                {/* Stack Selection */}
                <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-dim)' }}>
                        Product (Stack) *
                    </label>
                    <CustomSelect
                        name="stackId"
                        required
                        value={selectedStack}
                        onChange={(val) => {
                            setSelectedStack(val);
                            setSelectedLocation('');
                            setSelectedDestination('');
                        }}
                        options={stackOptions}
                        placeholder="Select a stack..."
                    />
                </div>

                {/* Source Location */}
                <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-dim)' }}>
                        {ticketType === 'barn_to_barn' ? 'Source Location *' : 'Pick-up Location *'}
                    </label>
                    <CustomSelect
                        name="locationId"
                        required
                        value={selectedLocation}
                        onChange={(val) => {
                            setSelectedLocation(val);
                            setSelectedDestination('');
                        }}
                        options={locationOptions}
                        placeholder="Select location..."
                    />
                    {availableStock && (
                        <p className="text-xs mt-1" style={{ color: 'var(--primary-light)' }}>
                            Available: {parseFloat(availableStock.quantity).toLocaleString()} bales
                        </p>
                    )}
                </div>

                {/* Destination Location (B2B only) */}
                {ticketType === 'barn_to_barn' && (
                    <div>
                        <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-dim)' }}>
                            Destination Location *
                        </label>
                        <CustomSelect
                            name="destinationId"
                            required
                            value={selectedDestination}
                            onChange={setSelectedDestination}
                            options={destinationOptions}
                            placeholder="Select destination..."
                        />
                    </div>
                )}

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

                {/* Net Lbs (Sale only) */}
                {ticketType === 'sale' && (
                    <div>
                        <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-dim)' }}>
                            Net Lbs
                        </label>
                        <input
                            type="number"
                            name="netLbs"
                            min="0"
                            step="0.01"
                            placeholder="Total net weight (optional)"
                            className="input-field"
                        />
                    </div>
                )}

                {/* Customer (Sale only, required) */}
                {ticketType === 'sale' && (
                    <div>
                        <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-dim)' }}>
                            Customer *
                        </label>
                        <input
                            type="text"
                            name="customer"
                            required
                            placeholder="Customer name"
                            className="input-field"
                        />
                    </div>
                )}

                {/* Notes / Comments */}
                <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-dim)' }}>
                        {ticketType === 'barn_to_barn' ? 'Comments' : 'Notes'}
                    </label>
                    <textarea
                        name="notes"
                        rows={3}
                        placeholder={ticketType === 'barn_to_barn'
                            ? "Transfer notes, reason, etc. (optional)"
                            : "Delivery notes, truck #, etc. (optional)"
                        }
                        className="input-field"
                    />
                </div>

                <button type="submit" className="btn btn-primary w-full">
                    Create {ticketType === 'sale' ? 'Sale' : 'Barn to Barn'} Ticket
                </button>
            </form>
        </div>
    );
}
