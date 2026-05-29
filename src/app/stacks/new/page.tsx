'use client';

import { createStack } from "@/app/actions";
import { BALE_SIZES, BALE_SIZE_WEIGHTS } from "@/lib/units";
import { useState } from "react";
import CustomSelect from "@/components/CustomSelect";
import PageHeader from "@/components/ui/PageHeader";
import SubmitButton from "@/components/ui/SubmitButton";
import HelpTip from "@/components/ui/HelpTip";

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

export default function NewStackPage() {
    const [baleSize, setBaleSize] = useState('3x4');
    const [weightPerBale, setWeightPerBale] = useState(BALE_SIZE_WEIGHTS['3x4']);
    const [priceUnit, setPriceUnit] = useState<'bale' | 'ton'>('bale');

    const baleSizeOptions = BALE_SIZES.map((size) => ({ value: size, label: size }));

    const handleBaleSizeChange = (newSize: string) => {
        setBaleSize(newSize);
        setWeightPerBale(BALE_SIZE_WEIGHTS[newSize] || 1200);
    };

    return (
        <div>
            <PageHeader
                eyebrow="New stack"
                title="Define a product"
                subtitle="A stack is one cutting, lot, or line of product. You'll use it on every ticket."
                backHref="/stacks"
                backLabel="Stacks"
            />

            <form action={createStack} className="surface-card space-y-5">
                <div>
                    <label className="label-modern">Stack name / lot #</label>
                    <input
                        type="text"
                        name="name"
                        required
                        className="input-modern"
                        placeholder="e.g. 2024-ALF-001"
                    />
                </div>

                <div>
                    <label className="label-modern">Commodity</label>
                    <CustomSelect name="commodity" options={COMMODITY_OPTIONS} defaultValue="Alfalfa" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="label-modern">
                            Bale size{' '}
                            <HelpTip learnMoreHref="/help/understanding-units">
                                The shape of your bales (like 3x4 or 3x3). Picking a size sets a typical weight per bale, which HayFlow uses to convert bales to tons.
                            </HelpTip>
                        </label>
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
                    <CustomSelect name="quality" options={QUALITY_OPTIONS} defaultValue="Premium" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="label-modern">
                            Base price ($){' '}
                            <HelpTip learnMoreHref="/help/understanding-units">
                                The default price for this hay. Enter it per bale or per ton — set which on the right. HayFlow stores price as $/ton internally so reports stay consistent.
                            </HelpTip>
                        </label>
                        <input
                            type="number"
                            name="basePrice"
                            step="0.01"
                            min="0"
                            inputMode="decimal"
                            className="input-modern"
                            placeholder="0.00"
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

                <SubmitButton className="w-full" pendingLabel="Creating stack…">
                    Create stack
                </SubmitButton>

                <p className="text-xs text-center" style={{ color: 'var(--text-dim)' }}>
                    You can adjust any of these later from the stack detail page.
                </p>
            </form>
        </div>
    );
}
