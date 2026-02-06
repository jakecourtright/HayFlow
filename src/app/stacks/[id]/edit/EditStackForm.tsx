'use client';

import { updateStack } from "@/app/actions";
import { BALE_SIZES, BALE_SIZE_WEIGHTS, getDefaultWeight } from "@/lib/units";
import { useState } from "react";

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

interface EditStackFormProps {
    stack: Stack;
}

export default function EditStackForm({ stack }: EditStackFormProps) {
    const [baleSize, setBaleSize] = useState(stack.bale_size || '3x4');
    const [weightPerBale, setWeightPerBale] = useState(
        stack.weight_per_bale || getDefaultWeight(stack.bale_size)
    );
    const [priceUnit, setPriceUnit] = useState<'bale' | 'ton'>(
        (stack.price_unit as 'bale' | 'ton') || 'bale'
    );

    const handleBaleSizeChange = (newSize: string) => {
        setBaleSize(newSize);
        // Only prefill if weight wasn't already customized
        if (!stack.weight_per_bale) {
            setWeightPerBale(BALE_SIZE_WEIGHTS[newSize] || 1200);
        }
    };

    const updateWithId = updateStack.bind(null, stack.id.toString());

    return (
        <form action={updateWithId} className="glass-card space-y-5">
            <div>
                <label className="label-modern">Lot/Stack Name</label>
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
                <select name="commodity" defaultValue={stack.commodity} className="select-modern">
                    <option value="Alfalfa">Alfalfa</option>
                    <option value="Timothy">Timothy</option>
                    <option value="Bermuda">Bermuda</option>
                    <option value="Oat Hay">Oat Hay</option>
                    <option value="Orchard Grass">Orchard Grass</option>
                    <option value="Straw">Straw</option>
                    <option value="Mixed Hay">Mixed Hay</option>
                </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label-modern">Bale Size</label>
                    <select
                        name="baleSize"
                        className="select-modern"
                        value={baleSize}
                        onChange={(e) => handleBaleSizeChange(e.target.value)}
                    >
                        {BALE_SIZES.map(size => (
                            <option key={size} value={size}>{size}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="label-modern">Weight/Bale (lbs)</label>
                    <input
                        type="number"
                        name="weightPerBale"
                        className="input-modern"
                        value={weightPerBale}
                        onChange={(e) => setWeightPerBale(parseInt(e.target.value) || 0)}
                        min="1"
                    />
                </div>
            </div>

            <div>
                <label className="label-modern">Quality</label>
                <select name="quality" defaultValue={stack.quality} className="select-modern">
                    <option value="Premium">Premium</option>
                    <option value="#1">#1 (Good)</option>
                    <option value="Feeder">Feeder / Economy</option>
                </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label-modern">Base Price ($)</label>
                    <input
                        type="number"
                        name="basePrice"
                        step="0.01"
                        defaultValue={stack.base_price}
                        className="input-modern"
                    />
                </div>
                <div>
                    <label className="label-modern">Price Per</label>
                    <select
                        name="priceUnit"
                        className="select-modern"
                        value={priceUnit}
                        onChange={(e) => setPriceUnit(e.target.value as 'bale' | 'ton')}
                    >
                        <option value="bale">Bale</option>
                        <option value="ton">Ton</option>
                    </select>
                </div>
            </div>

            <button type="submit" className="btn btn-primary w-full mt-4">
                Update Stack
            </button>
        </form>
    );
}
