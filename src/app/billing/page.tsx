import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PricingTable } from "@clerk/nextjs";
import { Sparkles, Check, CreditCard } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { getSubscriptionState, TRIAL_DAYS } from "@/lib/billing";

export default async function BillingPage() {
    const { userId, orgId } = await auth();
    if (!userId) redirect("/sign-in");
    if (!orgId) redirect("/welcome");

    const state = await getSubscriptionState();

    return (
        <div>
            <PageHeader
                eyebrow="Billing"
                title="Subscription"
                subtitle="Manage your HayFlow plan. One tier, no surprises."
                backHref="/settings"
                backLabel="Settings"
            />

            <div className="space-y-6">
                {state.kind === "active" && state.trialing && (
                    <div className="glass-card" style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
                        <div className="flex items-start gap-3">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{
                                    background: 'color-mix(in srgb, var(--primary) 18%, transparent)',
                                    color: 'var(--primary)',
                                }}
                            >
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <p className="font-bold" style={{ color: 'var(--text-main)' }}>
                                    Trial: {state.trialDaysLeft} {state.trialDaysLeft === 1 ? 'day' : 'days'} left
                                </p>
                                <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                                    Your card will be charged automatically when the trial ends. Cancel anytime.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {state.kind === "active" && !state.trialing && (
                    <div className="glass-card" style={{ background: 'color-mix(in srgb, var(--success) 10%, transparent)' }}>
                        <div className="flex items-start gap-3">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: 'var(--success)', color: 'white' }}
                            >
                                <Check size={20} strokeWidth={3} />
                            </div>
                            <div>
                                <p className="font-bold" style={{ color: 'var(--text-main)' }}>Subscription active</p>
                                <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                                    Thanks for using HayFlow. Manage or cancel below.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {state.kind === "inactive" && (
                    <div className="glass-card" style={{ background: 'color-mix(in srgb, var(--warning) 12%, transparent)' }}>
                        <div className="flex items-start gap-3">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: 'var(--warning)', color: 'white' }}
                            >
                                <CreditCard size={20} />
                            </div>
                            <div>
                                <p className="font-bold" style={{ color: 'var(--text-main)' }}>Subscription required</p>
                                <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                                    Start your {TRIAL_DAYS}-day trial below — no charge today.
                                    Read-only access until you subscribe.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="glass-card">
                    <PricingTable for="organization" />
                </div>

                <p className="text-center text-xs" style={{ color: 'var(--text-dim)' }}>
                    Secure checkout powered by Stripe · Cancel anytime from here
                </p>
            </div>
        </div>
    );
}
