'use client';

import { updateStack } from "@/app/actions";
import { BALE_SIZES, BALE_SIZE_WEIGHTS, getDefaultWeight } from "@/lib/units";
import { useState } from "react";
import CustomSelect from "@/components/CustomSelect";
import SubmitButton from "@/components/ui/SubmitButton";

interface Stack {
    id: number;
    name: string;
    commodity: string;
    bale_size: string;
    quality: string;
    base_price: number;
    weight_per_bale: number | null;
    price_unit: string;
}

const COMMODITY_OPTIONS = [
    { value: 'Alfalfa', label: 'Alfalfa' },
    { value: 'Timothy', label: 'Timothy' },
    { value: 'Bermuda', label: 'Bermuda' },
    { value: 'Oat Hay', label: 'Oat Hay' },
    { value: 'Orchard Grass', label: 'Orchard Grass' },
    { value: 'Straw', label: 'Straw' },
    { value: 'Mixed Hay', label: 'Mixed Hay' },
];

const QUALITY_OPTIONS = [
    { value: 'Premium', label: 'Premium' },
    { value: '#1', label: '#1 (Good)' },
    { value: 'Feeder', label: 'Feeder / Economy' },
];

const PRICE_UNIT_OPTIONS = [
    { value: 'bale', label: 'Per bale' },
    { value: 'ton', label: 'Per ton' },
];

export default function EditStackForm({ stack }: { stack: Stack }) {
    const [baleSize, setBaleSize] = useState(stack.bale_size || '3x4');
    const [weightPerBale, setWeightPerBale] = useState(
        stack.weight_per_bale || getDefaultWeight(stack.bale_size)
    );
    const [priceUnit, setPriceUnit] = useState<'bale' | 'ton'>(
        (stack.price_unit as 'bale' | 'ton') || 'bale'
    );

    const baleSizeOptions = BALE_SIZES.map((size) => ({ value: size, label: size }));

    const handleBaleSizeChange = (newSize: string) => {
        setBaleSize(newSize);
        if (!stack.weight_per_bale) {
            setWeightPerBale(BALE_SIZE_WEIGHTS[newSize] || 1200);
        }
    };

    const updateWithId = updateStack.bind(null, stack.id.toString());

    return (
        <form action={updateWithId} className="surface-card space-y-5">
            <div>
                <label className="label-modern">Lot / stack name</label>
                <input
                    type="text"
                    name="name"
                    required
                    defaultValue={stack.name}
                    className="input-modern"
                />
            </div>

            <div>
                <label className="label-modern">Commodity</label>
                <CustomSelect name="commodity" options={COMMODITY_OPTIONS} defaultValue={stack.commodity} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label-modern">Bale size</label>
                    <CustomSelect
                        name="baleSize"
                        options={baleSizeOptions}
                        value={baleSize}
                        onChange={handleBaleSizeChange}
                    />
                </div>
                <div>
                    <label className="label-modern">Weight/bale (lbs)</label>
                    <input
                        type="number"
                        name="weightPerBale"
                        className="input-modern"
                        value={weightPerBale}
                        onChange={(e) => setWeightPerBale(parseInt(e.target.value) || 0)}
                        min="1"
                        inputMode="numeric"
                    />
                </div>
            </div>

            <div>
                <label className="label-modern">Quality</label>
                <CustomSelect name="quality" options={QUALITY_OPTIONS} defaultValue={stack.quality} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label-modern">Base price ($)</label>
                    <input
                        type="number"
                        name="basePrice"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        defaultValue={stack.base_price}
                        className="input-modern"
                    />
                </div>
                <div>
                    <label className="label-modern">Priced</label>
                    <CustomSelect
                        name="priceUnit"
                        options={PRICE_UNIT_OPTIONS}
                        value={priceUnit}
                        onChange={(val) => setPriceUnit(val as 'bale' | 'ton')}
                    />
                </div>
            </div>

            <SubmitButton className="w-full" pendingLabel="Saving…">
                Save changes
            </SubmitButton>
        </form>
    );
}
