'use client';

import { submitTransaction } from "../actions";
import { useState } from "react";
import { useRouter } from "next/navigation";
import CustomSelect from "@/components/CustomSelect";
import HelpTip from "@/components/ui/HelpTip";

interface LogFormProps {
    stacks: any[];
    locations: any[];
    type?: string;
    inventory: any[];
}

export default function LogForm({ stacks, locations, type: initialType, inventory = [] }: LogFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [selectedType, setSelectedType] = useState(initialType || 'production');
    const [selectedStackId, setSelectedStackId] = useState('');
    const [selectedLocationId, setSelectedLocationId] = useState('');
    const [adjustDirection, setAdjustDirection] = useState('remove');
    const [error, setError] = useState<string | null>(null);

    // If initialType is provided, lock the form to that type
    const isTypeLocked = !!initialType;

    // Filter logic
    const isSale = selectedType === 'sale';
    const isAdjustment = selectedType === 'adjustment';

    // Get available inventory for selected stack at selected location (if applicable)
    const getAvailableStock = (stackId: string, locationId: string) => {
        // loose equality to handle string/number mismatch
        const item = inventory.find(i => i.stack_id == stackId && i.location_id == locationId);
        return item ? parseFloat(item.quantity) : 0;
    };

    // Filter locations based on inventory if it's a sale
    const filteredLocations = isSale && selectedStackId
        ? locations.filter(l => getAvailableStock(selectedStackId, l.id) > 0)
        : locations;


    const getPriceLabel = (type: string) => {
        switch (type) {
            case 'production': return 'Production Cost ($/unit)';
            case 'purchase': return 'Purchase Price ($/unit)';
            case 'sale': return 'Sale Price ($/unit)';
            case 'adjustment': return 'Value Adjustment ($/unit)';
            default: return 'Price / Cost ($/unit)';
        }
    };

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        const formData = new FormData(event.currentTarget);
        const amount = parseFloat(formData.get('amount') as string);

        // Client-side validation for sales
        if (isSale && selectedStackId && selectedLocationId) {
            const available = getAvailableStock(selectedStackId, selectedLocationId);
            if (amount > available) {
                setError(`Insufficient stock! You only have ${available} available at this location.`);
                setLoading(false);
                return;
            }
        }

        try {
            setError(null);
            await submitTransaction(formData);
            router.push('/');
        } catch (e: any) {
            if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e;
            setError('Error logging transaction. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    const typeOptions = [
        { value: 'production', label: 'Production (In)' },
        { value: 'purchase', label: 'Purchase (In)' },
        { value: 'adjustment', label: 'Adjustment' },
    ];

    const stackOptions = [
        { value: '', label: 'Select Stack...' },
        ...stacks.map(s => ({ value: String(s.id), label: `${s.name} (${s.commodity})` })),
    ];

    const locationOptions = [
        { value: 'none', label: 'None (In Transit / Sold)' },
        ...filteredLocations.map(l => {
            const stock = isSale && selectedStackId ? getAvailableStock(selectedStackId, l.id) : null;
            return {
                value: String(l.id),
                label: `${l.name}${stock !== null ? ` (Avail: ${stock})` : ''}`,
            };
        }),
    ];

    const unitOptions = [
        { value: 'bales', label: 'Bales' },
        { value: 'tons', label: 'Tons' },
    ];

    const priceUnitOptions = [
        { value: 'ton', label: '$ / Ton' },
        { value: 'bale', label: '$ / Bale' },
    ];

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                    {error}
                </div>
            )}
            <div className="grid grid-cols-2 gap-4">
                {/* Type Selection - Hidden if type is locked */}
                <div className={isTypeLocked ? 'hidden' : ''}>
                    <label className="label-modern">
                        Type{' '}
                        <HelpTip learnMoreHref="/help/logging-inventory">
                            Production = hay you baled. Purchase = hay you bought in. Adjustment = a correction (shrink, spoilage, a recount). Sales aren&apos;t logged here — use Quick Sale or a ticket.
                        </HelpTip>
                    </label>
                    <CustomSelect
                        name={isTypeLocked ? '_type_display' : 'type'}
                        options={typeOptions}
                        value={selectedType}
                        onChange={setSelectedType}
                    />
                </div>

                {/* Hidden input to ensure type is submitted when select is hidden */}
                {isTypeLocked && <input type="hidden" name="type" value={selectedType} />}

                <div className={isTypeLocked ? 'col-span-2' : ''}>
                    <label className="label-modern">Stack (Product)</label>
                    <CustomSelect
                        name="stackId"
                        required
                        options={stackOptions}
                        value={selectedStackId}
                        onChange={(val) => {
                            setSelectedStackId(val);
                            setSelectedLocationId(''); // Reset location when stack changes
                        }}
                        placeholder="Select Stack..."
                    />
                </div>
            </div>

            <div>
                <label className="label-modern">{isSale ? 'Source Location' : isAdjustment ? 'Location' : 'Destination Location'}</label>
                <CustomSelect
                    name="locationId"
                    options={locationOptions}
                    value={selectedLocationId || 'none'}
                    onChange={setSelectedLocationId}
                />
                {isSale && filteredLocations.length === 0 && selectedStackId && (
                    <p className="text-red-500 text-sm mt-1">No stock available for this stack.</p>
                )}
                {isAdjustment && selectedStackId && selectedLocationId && selectedLocationId !== 'none' && (
                    <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>
                        HayFlow currently shows {getAvailableStock(selectedStackId, selectedLocationId).toLocaleString()} bales of this stack here.
                    </p>
                )}
            </div>

            {isAdjustment && (
                <div>
                    <label className="label-modern">Correction</label>
                    <CustomSelect
                        name="adjustDirection"
                        options={[
                            { value: 'remove', label: 'Remove bales (shrink, spoilage, missing)' },
                            { value: 'add', label: 'Add bales (found, recount up)' },
                        ]}
                        value={adjustDirection}
                        onChange={setAdjustDirection}
                    />
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label-modern">Amount</label>
                    <input type="number" name="amount" required step="0.01" className="input-modern" placeholder="0" />
                </div>
                <div>
                    <label className="label-modern">Unit</label>
                    <CustomSelect
                        name="unit"
                        options={unitOptions}
                        defaultValue="bales"
                    />
                </div>
            </div>

            <div>
                <label className="label-modern">Entity / Notes</label>
                <input type="text" name="entity" className="input-modern" placeholder="Buyer Name / Field # / Notes" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label-modern">{getPriceLabel(selectedType)}</label>
                    <input type="number" name="price" step="0.01" className="input-modern" placeholder="0.00" />
                </div>
                <div>
                    <label className="label-modern">Price Per</label>
                    <CustomSelect
                        name="priceUnit"
                        options={priceUnitOptions}
                        defaultValue="ton"
                    />
                </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full mt-6">
                {loading ? 'Logging...' : 'Log Transaction'}
            </button>
        </form>
    );
}
