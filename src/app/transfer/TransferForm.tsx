'use client';

import { createTransfer } from "@/app/actions";
import { useState } from "react";
import { AlertCircle, Info, ArrowRight } from "lucide-react";
import CustomSelect from "@/components/CustomSelect";
import SubmitButton from "@/components/ui/SubmitButton";
import { resolveWeight, tonsToBales, balesToTons } from "@/lib/units";

interface TransferFormProps {
    stacks: any[];
    locations: any[];
    inventory: any[];
    presetStackId?: string;
    presetSourceId?: string;
}

export default function TransferForm({ stacks, locations, inventory, presetStackId, presetSourceId }: TransferFormProps) {
    const validPresetStack = presetStackId && stacks.some((s) => s.id.toString() === presetStackId) ? presetStackId : '';
    const [selectedStack, setSelectedStack] = useState(validPresetStack);
    const [selectedSource, setSelectedSource] = useState(presetSourceId || '');
    const [selectedDestination, setSelectedDestination] = useState('');
    const [unit, setUnit] = useState<'bales' | 'tons'>('bales');
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');

    // Locations that actually hold this stack — the only valid sources.
    const validSourceIds = selectedStack
        ? inventory
            .filter((i) => i.stack_id?.toString() === selectedStack && parseFloat(i.quantity) > 0)
            .map((i) => i.location_id?.toString())
        : [];
    // Snap source back to empty if it isn't a valid source for the chosen stack.
    const effectiveSource = validSourceIds.includes(selectedSource) ? selectedSource : '';

    const stack = stacks.find((s) => s.id.toString() === selectedStack);
    const weight = stack ? resolveWeight(stack.weight_per_bale, stack.bale_size) : 1200;

    const sourceStock = inventory.find(
        (i) => i.stack_id?.toString() === selectedStack && i.location_id?.toString() === effectiveSource
    );
    const availableBales = sourceStock ? parseFloat(sourceStock.quantity) : null;

    const enteredAmount = parseFloat(amount) || 0;
    const movingBales = unit === 'tons' ? tonsToBales(enteredAmount, weight) : enteredAmount;
    const overStock = availableBales !== null && movingBales > availableBales;

    const stackOptions = stacks.map((s: any) => ({
        value: s.id.toString(),
        label: `${s.name} — ${s.commodity}`,
    }));

    const sourceOptions = locations.map((l: any) => {
        const hasStock = validSourceIds.includes(l.id.toString());
        return {
            value: l.id.toString(),
            label: `${l.name}${selectedStack && !hasStock ? ' (no stock)' : ''}`,
            disabled: selectedStack ? !hasStock : true,
        };
    });

    const destinationOptions = locations
        .filter((l: any) => l.id.toString() !== effectiveSource)
        .map((l: any) => ({ value: l.id.toString(), label: l.name }));

    async function handleSubmit(formData: FormData) {
        try {
            setError('');
            await createTransfer(formData);
        } catch (e: any) {
            if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e;
            setError(e.message || 'Failed to move inventory');
        }
    }

    return (
        <div className="space-y-4">
            {error && (
                <div
                    role="alert"
                    className="flex items-start gap-2 p-3 rounded-xl text-sm"
                    style={{ background: 'color-mix(in srgb, var(--error) 12%, transparent)', color: 'var(--error)' }}
                >
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            <form action={handleSubmit} className="surface-card space-y-5">
                <div
                    className="flex items-start gap-2 p-3 rounded-xl text-sm"
                    style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--text-dim)' }}
                >
                    <Info size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
                    <span>This moves hay between your own barns — no sale, no revenue. Inventory updates the moment you submit.</span>
                </div>

                <div>
                    <label className="label-modern">Product (stack) *</label>
                    <CustomSelect
                        name="stackId"
                        required
                        value={selectedStack}
                        onChange={setSelectedStack}
                        options={stackOptions}
                        placeholder="Select a stack..."
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] sm:items-end gap-3">
                    <div>
                        <label className="label-modern">From barn *</label>
                        <CustomSelect
                            name="sourceId"
                            required
                            value={effectiveSource}
                            onChange={setSelectedSource}
                            options={sourceOptions}
                            placeholder="Source..."
                        />
                    </div>
                    <div className="hidden sm:flex items-center justify-center pb-3" style={{ color: 'var(--text-dim)' }}>
                        <ArrowRight size={18} />
                    </div>
                    <div>
                        <label className="label-modern">To barn *</label>
                        <CustomSelect
                            name="destinationId"
                            required
                            value={selectedDestination}
                            onChange={setSelectedDestination}
                            options={destinationOptions}
                            placeholder="Destination..."
                        />
                    </div>
                </div>

                {availableBales !== null && (
                    <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-dim)' }}>
                        <Info size={12} />
                        <span>
                            Available to move:{' '}
                            <strong style={{ color: 'var(--accent)' }}>{availableBales.toLocaleString()} bales</strong>
                            {' '}({balesToTons(availableBales, weight).toFixed(2)} tons)
                        </span>
                    </p>
                )}

                <div>
                    <label className="label-modern">Amount *</label>
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                        <input
                            type="number"
                            name="amount"
                            required
                            min="0"
                            step="any"
                            inputMode="decimal"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="How much to move"
                            className="input-modern"
                            aria-invalid={overStock}
                        />
                        <div className="w-28">
                            <CustomSelect
                                name="unit"
                                value={unit}
                                onChange={(val) => setUnit(val as 'bales' | 'tons')}
                                options={[
                                    { value: 'bales', label: 'Bales' },
                                    { value: 'tons', label: 'Tons' },
                                ]}
                            />
                        </div>
                    </div>
                    {unit === 'tons' && enteredAmount > 0 && (
                        <p className="text-xs mt-1.5" style={{ color: 'var(--text-dim)' }}>
                            ≈ {movingBales.toLocaleString()} bales will move (stored in bales)
                        </p>
                    )}
                    {overStock && (
                        <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: 'var(--error)' }}>
                            <AlertCircle size={12} />
                            Exceeds available stock ({availableBales!.toLocaleString()} bales)
                        </p>
                    )}
                </div>

                <div>
                    <label className="label-modern">Comments</label>
                    <textarea
                        name="notes"
                        rows={2}
                        placeholder="Reason, truck #, etc. (optional)"
                        className="input-modern"
                    />
                </div>

                <SubmitButton
                    variant="primary"
                    className="w-full"
                    disabled={overStock}
                    pendingLabel="Moving bales…"
                >
                    Move bales
                </SubmitButton>
            </form>
        </div>
    );
}
