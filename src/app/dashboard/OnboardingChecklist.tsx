import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import Link from "next/link";
import { Check, ArrowRight, Sparkles } from "lucide-react";

interface Step {
    key: string;
    label: string;
    description: string;
    href: string;
    done: boolean;
}

async function loadOnboardingState(orgId: string): Promise<Step[]> {
    const client = await pool.connect();
    try {
        const [profileRes, locationRes, stackRes, txRes] = await Promise.all([
            client.query(
                'SELECT 1 FROM business_profiles WHERE org_id = $1 AND name IS NOT NULL AND name <> \'\' LIMIT 1',
                [orgId]
            ),
            client.query('SELECT 1 FROM locations WHERE org_id = $1 LIMIT 1', [orgId]),
            client.query('SELECT 1 FROM stacks WHERE org_id = $1 LIMIT 1', [orgId]),
            client.query('SELECT 1 FROM transactions WHERE org_id = $1 LIMIT 1', [orgId]),
        ]);

        return [
            {
                key: 'business',
                label: 'Set up your business profile',
                description: 'Name, address, and payment info on every invoice.',
                href: '/settings/business',
                done: profileRes.rows.length > 0,
            },
            {
                key: 'location',
                label: 'Add your first barn',
                description: 'Where you store hay — name it and set capacity.',
                href: '/locations/new',
                done: locationRes.rows.length > 0,
            },
            {
                key: 'stack',
                label: 'Add your first stack',
                description: 'A lot of hay — commodity, bale size, price.',
                href: '/stacks/new',
                done: stackRes.rows.length > 0,
            },
            {
                key: 'transaction',
                label: 'Log your first production',
                description: 'Tell HayFlow you baled some hay.',
                href: '/log?type=production',
                done: txRes.rows.length > 0,
            },
        ];
    } finally {
        client.release();
    }
}

export default async function OnboardingChecklist() {
    const { orgId } = await auth();
    if (!orgId) return null;

    const steps = await loadOnboardingState(orgId);
    const doneCount = steps.filter(s => s.done).length;
    const allDone = doneCount === steps.length;
    if (allDone) return null;

    const nextStep = steps.find(s => !s.done);

    return (
        <section className="glass-card mb-4">
            <div className="flex items-center gap-3 mb-4">
                <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                        background: 'color-mix(in srgb, var(--primary) 14%, transparent)',
                        color: 'var(--primary)',
                    }}
                >
                    <Sparkles size={18} />
                </div>
                <div className="flex-1">
                    <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>
                        Get started
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                        {doneCount} of {steps.length} done — {nextStep ? 'keep going' : 'all set!'}
                    </p>
                </div>
            </div>

            <ul className="space-y-2">
                {steps.map(step => (
                    <li key={step.key}>
                        {step.done ? (
                            <div
                                className="flex items-center gap-3 p-3 rounded-xl"
                                style={{
                                    background: 'color-mix(in srgb, var(--success) 10%, transparent)',
                                    color: 'var(--text-dim)',
                                }}
                            >
                                <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{ background: 'var(--success)', color: 'white' }}
                                >
                                    <Check size={14} strokeWidth={3} />
                                </div>
                                <span className="font-medium line-through">{step.label}</span>
                            </div>
                        ) : (
                            <Link
                                href={step.href}
                                className="flex items-center gap-3 p-3 rounded-xl hover:brightness-110 transition-all"
                                style={{
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--glass-border)',
                                }}
                            >
                                <div
                                    className="w-6 h-6 rounded-full flex-shrink-0"
                                    style={{
                                        border: '2px solid var(--text-dim)',
                                    }}
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold" style={{ color: 'var(--text-main)' }}>
                                        {step.label}
                                    </p>
                                    <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                        {step.description}
                                    </p>
                                </div>
                                <ArrowRight size={16} style={{ color: 'var(--primary)' }} className="flex-shrink-0" />
                            </Link>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );
}
