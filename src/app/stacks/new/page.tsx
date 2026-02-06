'use client';

import { createStack } from "@/app/actions";
import { BALE_SIZES, BALE_SIZE_WEIGHTS } from "@/lib/units";
import { useState } from "react";

export default function NewStackPage() {
    const [baleSize, setBaleSize] = useState('3x4');
    const [weightPerBale, setWeightPerBale] = useState(BALE_SIZE_WEIGHTS['3x4']);
    const [priceUnit, setPriceUnit] = useState<'bale' | 'ton'>('bale');

    const handleBaleSizeChange = (newSize: string) => {
        setBaleSize(newSize);
        // Prefill with default weight for this bale size
        setWeightPerBale(BALE_SIZE_WEIGHTS[newSize] || 1200);
    };

    return (
        <div className="max-w-md mx-auto">
            <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--accent)' }}>Create New Stack</h1>

            <form action={createStack} className="glass-card space-y-5">
                <div>
                    <label className="label-modern">Stack Name / Lot #</label>
                    <input type="text" name="name" required className="input-modern" placeholder="e.g. 2024-ALF-001" />
                </div>

                <div>
                    <label className="label-modern">Commodity</label>
                    <select name="commodity" className="select-modern">
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
                    <select name="quality" className="select-modern">
                        <option value="Premium">Premium</option>
                        <option value="#1">#1 (Good)</option>
                        <option value="Feeder">Feeder / Economy</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="label-modern">Base Price ($)</label>
                        <input type="number" name="basePrice" step="0.01" className="input-modern" placeholder="0.00" />
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
                    Create Product
                </button>
            </form>
        </div>
    );
}
