import Link from "next/link";
import { Sparkles, CreditCard, ArrowRight } from "lucide-react";
import { getSubscriptionState } from "@/lib/billing";

export default async function TrialBanner() {
    const state = await getSubscriptionState();

    if (state.kind === "no-org") return null;

    if (state.kind === "active" && !state.trialing) return null;

    if (state.kind === "active" && state.trialing) {
        const days = state.trialDaysLeft!;
        // Only surface when trial is actually close to ending
        if (days > 3) return null;

        return (
            <Link
                href="/billing"
                className="block border-b"
                style={{
                    background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                    borderColor: 'var(--glass-border)',
                }}
            >
                <div className="container mx-auto px-6 py-2.5 max-w-3xl flex items-center gap-3">
                    <Sparkles size={16} style={{ color: 'var(--primary)' }} className="flex-shrink-0" />
                    <p className="text-sm flex-1" style={{ color: 'var(--text-main)' }}>
                        <span className="font-semibold">
                            Trial ends in {days} {days === 1 ? 'day' : 'days'}.
                        </span>
                        <span className="hidden sm:inline" style={{ color: 'var(--text-dim)' }}>
                            {' '}Your card will be charged automatically.
                        </span>
                    </p>
                    <span className="text-sm font-semibold flex items-center gap-1" style={{ color: 'var(--primary)' }}>
                        Manage <ArrowRight size={14} />
                    </span>
                </div>
            </Link>
        );
    }

    // inactive — past-due or never subscribed
    return (
        <Link
            href="/billing"
            className="block border-b"
            style={{
                background: 'color-mix(in srgb, var(--warning) 18%, transparent)',
                borderColor: 'var(--glass-border)',
            }}
        >
            <div className="container mx-auto px-6 py-2.5 max-w-3xl flex items-center gap-3">
                <CreditCard size={16} style={{ color: 'var(--warning)' }} className="flex-shrink-0" />
                <p className="text-sm flex-1" style={{ color: 'var(--text-main)' }}>
                    <span className="font-semibold">Read-only mode.</span>
                    <span className="hidden sm:inline" style={{ color: 'var(--text-dim)' }}>
                        {' '}Subscribe to keep logging inventory and sending invoices.
                    </span>
                </p>
                <span className="text-sm font-semibold flex items-center gap-1" style={{ color: 'var(--warning)' }}>
                    Subscribe <ArrowRight size={14} />
                </span>
            </div>
        </Link>
    );
}
