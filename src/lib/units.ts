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

/**
 * Resolve a line item's effective rate. Prefers the ticket's own per-line price
 * (Quick Sale multi-item); falls back to the invoice-level rate when the line has
 * none (legacy/dispatch invoices). Keeps all four money surfaces in agreement.
 */
export function resolveLineRate(
    ticketRate: unknown,
    ticketUnit: unknown,
    invoiceRate: unknown,
    invoiceUnit: unknown,
): { rate: number; unit: 'bale' | 'ton' } {
    const t = Number(ticketRate) || 0;
    if (t > 0) return { rate: t, unit: ticketUnit === 'bale' ? 'bale' : 'ton' };
    return { rate: Number(invoiceRate) || 0, unit: invoiceUnit === 'bale' ? 'bale' : 'ton' };
}

/**
 * Dollar amount for a single line. Per-ton lines use scale weight (net lbs)
 * when available, else estimate from bale count × the stack's weight per bale
 * — a per-ton line without a scale weight must never silently price at $0.
 * Per-bale lines use the bale count. Returns 0 when unpriced.
 */
export function lineAmount(
    bales: number,
    netLbs: number,
    rate: number,
    unit: 'bale' | 'ton',
    estLbsPerBale: number = 0,
): number {
    if (!rate || rate <= 0) return 0;
    if (unit === 'bale') return bales * rate;
    const lbs = netLbs > 0 ? netLbs : bales * estLbsPerBale;
    return (lbs / LBS_PER_TON) * rate;
}

