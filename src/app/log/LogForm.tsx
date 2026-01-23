'use client';

import { submitTransaction } from "../actions";
import { useState } from "react";
import { useRouter } from "next/navigation";

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
    const [error, setError] = useState<string | null>(null);

    // If initialType is provided, lock the form to that type
    const isTypeLocked = !!initialType;

    // Filter logic
    const isSale = selectedType === 'sale';

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
        } catch (e) {
            setError('Error logging transaction. Please try again.');
        } finally {
            setLoading(false);
        }
    }

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
                    <label className="label-modern">Type</label>
                    <select
                        name={isTypeLocked ? undefined : "type"}
                        className="select-modern"
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                    >
                        <option value="production">Production (In)</option>
                        <option value="sale">Sale (Out)</option>
                        <option value="purchase">Purchase (In)</option>
                        <option value="move">Move</option>
                        <option value="adjustment">Adjustment</option>
                    </select>
                </div>

                {/* Hidden input to ensure type is submitted when select is hidden */}
                {isTypeLocked && <input type="hidden" name="type" value={selectedType} />}

                <div className={isTypeLocked ? 'col-span-2' : ''}>
                    <label className="label-modern">Stack (Product)</label>
                    <select
                        name="stackId"
                        required
                        className="select-modern"
                        value={selectedStackId}
                        onChange={(e) => {
                            setSelectedStackId(e.target.value);
                            setSelectedLocationId(''); // Reset location when stack changes
                        }}
                    >
                        <option value="">Select Stack...</option>
                        {stacks.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.commodity})</option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <label className="label-modern">{isSale ? 'Source Location' : 'Destination Location'}</label>
                <select
                    name="locationId"
                    className="select-modern"
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                >
                    <option value="none">None (In Transit / Sold)</option>
                    {filteredLocations.map(l => {
                        const stock = isSale && selectedStackId ? getAvailableStock(selectedStackId, l.id) : null;
                        return (
                            <option key={l.id} value={l.id}>
                                {l.name} {stock !== null ? `(Avail: ${stock})` : ''}
                            </option>
                        );
                    })}
                </select>
                {isSale && filteredLocations.length === 0 && selectedStackId && (
                    <p className="text-red-500 text-sm mt-1">No stock available for this stack.</p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label-modern">Amount</label>
                    <input type="number" name="amount" required step="0.01" className="input-modern" placeholder="0" />
                </div>
                <div>
                    <label className="label-modern">Unit</label>
                    <select name="unit" className="select-modern">
                        <option value="bales">Bales</option>
                        <option value="tons">Tons</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="label-modern">Entity / Notes</label>
                <input type="text" name="entity" className="input-modern" placeholder="Buyer Name / Field # / Notes" />
            </div>

            <div>
                <label className="label-modern">{getPriceLabel(selectedType)}</label>
                <input type="number" name="price" step="0.01" className="input-modern" placeholder="0.00" />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full mt-6">
                {loading ? 'Logging...' : 'Log Transaction'}
            </button>
        </form>
    );
}
