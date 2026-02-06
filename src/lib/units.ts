// Unit conversion utilities for bales and tons
// BASE UNIT: Tons - all prices are normalized to $/ton for consistent reporting

// Default weights per bale size (in lbs)
export const BALE_SIZE_WEIGHTS: Record<string, number> = {
    '3x3': 1100,
    '3x4': 1200,
    '4x4': 1800,
    '2-Tie': 60,
    '3-Tie': 90,
};

// All supported bale sizes
export const BALE_SIZES = Object.keys(BALE_SIZE_WEIGHTS);

// 1 ton = 2000 lbs
export const LBS_PER_TON = 2000;

/**
 * Get the default weight for a bale size
 */
export function getDefaultWeight(baleSize: string): number {
    return BALE_SIZE_WEIGHTS[baleSize] || 1200; // Default to 1200 if unknown
}

/**
 * Convert bales to tons
 */
export function balesToTons(bales: number, weightPerBale: number): number {
    return (bales * weightPerBale) / LBS_PER_TON;
}

/**
 * Convert tons to bales (rounds to whole bales)
 */
export function tonsToBales(tons: number, weightPerBale: number): number {
    return Math.round((tons * LBS_PER_TON) / weightPerBale);
}

/**
 * Convert $/bale to $/ton (normalize price to base unit)
 * Formula: $/ton = $/bale * (2000 / weightPerBale)
 */
export function pricePerBaleToPerTon(pricePerBale: number, weightPerBale: number): number {
    return pricePerBale * (LBS_PER_TON / weightPerBale);
}

/**
 * Convert $/ton to $/bale (for display when user prefers bale pricing)
 * Formula: $/bale = $/ton * (weightPerBale / 2000)
 */
export function pricePerTonToPerBale(pricePerTon: number, weightPerBale: number): number {
    return pricePerTon * (weightPerBale / LBS_PER_TON);
}

/**
 * Normalize price to $/ton based on input unit
 * Always returns $/ton for consistent storage and reporting
 */
export function normalizePrice(price: number, inputUnit: 'bale' | 'ton', weightPerBale: number): number {
    if (inputUnit === 'ton') {
        return price; // Already in $/ton
    }
    return pricePerBaleToPerTon(price, weightPerBale);
}

/**
 * Format a number with locale-specific formatting
 */
export function formatNumber(num: number, decimals: number = 0): string {
    return num.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

/**
 * Format bales with optional tons display
 * e.g., "1,250 bales (1.03 tons)"
 */
export function formatDualUnits(bales: number, weightPerBale: number): string {
    const tons = balesToTons(bales, weightPerBale);
    return `${formatNumber(bales)} bales (${formatNumber(tons, 2)} tons)`;
}

/**
 * Get weight per bale, using stack override or bale size default
 */
export function resolveWeight(weightPerBale: number | null, baleSize: string): number {
    return weightPerBale || getDefaultWeight(baleSize);
}

