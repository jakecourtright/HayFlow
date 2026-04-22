'use client';

import { createTicket } from "@/app/actions";
import { useState } from "react";
import { AlertCircle, Info } from "lucide-react";
import CustomSelect from "@/components/CustomSelect";
import SubmitButton from "@/components/ui/SubmitButton";

interface TicketFormProps {
    stacks: any[];
    locations: any[];
    inventory: any[];
}

const TICKET_TYPES = [
    { value: 'sale', label: 'Sale — load out to a customer' },
    { value: 'barn_to_barn', label: 'Transfer — move between barns' },
];

export default function TicketForm({ stacks, locations, inventory }: TicketFormProps) {
    const [ticketType, setTicketType] = useState('sale');
    const [selectedStack, setSelectedStack] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('');
    const [selectedDestination, setSelectedDestination] = useState('');
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');

    const availableStock = inventory.find(
        (inv: any) =>
            inv.stack_id?.toString() === selectedStack &&
            inv.location_id?.toString() === selectedLocation
    );
    const availableBales = availableStock ? parseFloat(availableStock.quantity) : null;
    const requestedBales = parseFloat(amount) || 0;
    const overStock = availableBales !== null && requestedBales > availableBales;

    const locationsWithStock = selectedStack
        ? inventory
            .filter((inv: any) => inv.stack_id?.toString() === selectedStack && parseFloat(inv.quantity) > 0)
            .map((inv: any) => inv.location_id?.toString())
        : [];

    const stackOptions = stacks.map((s: any) => ({
        value: s.id.toString(),
        label: `${s.name} — ${s.commodity}`,
    }));

    const locationOptions = locations.map((l: any) => {
        const hasStock = locationsWithStock.includes(l.id.toString());
        return {
            value: l.id.toString(),
            label: `${l.name}${selectedStack && !hasStock ? ' (no stock)' : ''}`,
            disabled: selectedStack ? !hasStock : false,
        };
    });

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
            if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e;
            setError(e.message || 'Failed to create ticket');
        }
    }

    const isTransfer = ticketType === 'barn_to_barn';

    return (
        <div className="space-y-4">
            {error && (
                <div
                    role="alert"
                    className="flex items-start gap-2 p-3 rounded-xl text-sm"
                    style={{
                        background: 'color-mix(in srgb, var(--error) 12%, transparent)',
                        color: 'var(--error)',
                    }}
                >
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            <form action={handleSubmit} className="surface-card space-y-5">
                <div>
                    <label className="label-modern">Ticket type *</label>
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

                <div>
                    <label className="label-modern">Product (stack) *</label>
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

                <div>
                    <label className="label-modern">
                        {isTransfer ? 'Source location *' : 'Pick-up location *'}
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
                    {availableBales !== null && (
                        <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: 'var(--text-dim)' }}>
                            <Info size={12} />
                            <span>
                                Available here:{' '}
                                <strong style={{ color: 'var(--accent)' }}>
                                    {availableBales.toLocaleString()} bales
                                </strong>
                            </span>
                        </p>
                    )}
                </div>

                {isTransfer && (
                    <div>
                        <label className="label-modern">Destination location *</label>
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

                <div>
                    <label className="label-modern">Bales *</label>
                    <input
                        type="number"
                        name="amount"
                        required
                        min="1"
                        step="1"
                        inputMode="numeric"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Number of bales"
                        className="input-modern"
                        aria-invalid={overStock}
                    />
                    {overStock && (
                        <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: 'var(--error)' }}>
                            <AlertCircle size={12} />
                            Exceeds available stock ({availableBales!.toLocaleString()} bales)
                        </p>
                    )}
                </div>

                {!isTransfer && (
                    <>
                        <div>
                            <label className="label-modern">Net lbs</label>
                            <input
                                type="number"
                                name="netLbs"
                                min="0"
                                step="0.01"
                                inputMode="decimal"
                                placeholder="Total net weight (optional)"
                                className="input-modern"
                            />
                        </div>
                        <div>
                            <label className="label-modern">Customer *</label>
                            <input
                                type="text"
                                name="customer"
                                required
                                placeholder="Customer name"
                                className="input-modern"
                            />
                        </div>
                    </>
                )}

                <div>
                    <label className="label-modern">{isTransfer ? 'Comments' : 'Notes'}</label>
                    <textarea
                        name="notes"
                        rows={3}
                        placeholder={isTransfer
                            ? "Transfer notes, reason, etc. (optional)"
                            : "Delivery notes, truck #, etc. (optional)"}
                        className="input-modern"
                    />
                </div>

                <SubmitButton
                    variant="primary"
                    className="w-full"
                    disabled={overStock}
                    pendingLabel="Creating ticket…"
                >
                    Create {isTransfer ? 'transfer' : 'sale'} ticket
                </SubmitButton>

                <p className="text-xs text-center" style={{ color: 'var(--text-dim)' }}>
                    Tickets start as <strong>pending</strong>. Inventory moves once the office approves.
                </p>
            </form>
        </div>
    );
}
