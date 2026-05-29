import { auth, clerkClient } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import Link from "next/link";
import { Check, ArrowRight, Sparkles, BookOpen } from "lucide-react";
import { getPermissionFlags } from "@/lib/permissions";
import StartTourButton from "@/components/help/StartTourButton";

interface Step {
    key: string;
    label: string;
    description: string;
    href: string;
    done: boolean;
}

interface Flags {
    canManageInvoices: boolean;
    canManageUsers: boolean;
}

async function loadOnboardingState(orgId: string, flags: Flags): Promise<Step[]> {
    const client = await pool.connect();
    try {
        const [profileRes, locationRes, stackRes, txRes, invoiceRes, saleTicketRes] = await Promise.all([
            client.query(
                'SELECT 1 FROM business_profiles WHERE org_id = $1 AND name IS NOT NULL AND name <> \'\' LIMIT 1',
                [orgId]
            ),
            client.query('SELECT 1 FROM locations WHERE org_id = $1 LIMIT 1', [orgId]),
            client.query('SELECT 1 FROM stacks WHERE org_id = $1 LIMIT 1', [orgId]),
            client.query('SELECT 1 FROM transactions WHERE org_id = $1 LIMIT 1', [orgId]),
            client.query('SELECT 1 FROM invoices WHERE org_id = $1 LIMIT 1', [orgId]),
            client.query("SELECT 1 FROM tickets WHERE org_id = $1 AND type = 'sale' LIMIT 1", [orgId]),
        ]);

        const firstSaleDone = invoiceRes.rows.length > 0 || saleTicketRes.rows.length > 0;

        // Team step (admins only). Done once a second member is on the org.
        // Best-effort Clerk lookup — never block the dashboard on it.
        let teamInvited = false;
        if (flags.canManageUsers) {
            try {
                const cc = await clerkClient();
                const memberships = await cc.organizations.getOrganizationMembershipList({
                    organizationId: orgId,
                    limit: 2,
                });
                teamInvited = (memberships.totalCount ?? memberships.data.length) > 1;
            } catch {
                teamInvited = false;
            }
        }

        const steps: Step[] = [
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

        if (flags.canManageUsers) {
            steps.push({
                key: 'team',
                label: 'Invite your team',
                description: 'Add drivers and bookkeepers, and set their roles.',
                href: '/settings',
                done: teamInvited,
            });
        }

        steps.push({
            key: 'sale',
            label: 'Make your first sale',
            description: flags.canManageInvoices
                ? 'Use Quick Sale to sell and invoice in one step.'
                : 'File a sale ticket for a customer.',
            href: flags.canManageInvoices ? '/sell' : '/tickets/new',
            done: firstSaleDone,
        });

        return steps;
    } finally {
        client.release();
    }
}

export default async function OnboardingChecklist() {
    const { orgId } = await auth();
    if (!orgId) return null;

    const flags = await getPermissionFlags();
    const steps = await loadOnboardingState(orgId, {
        canManageInvoices: flags.canManageInvoices,
        canManageUsers: flags.canManageUsers,
    });
    const doneCount = steps.filter(s => s.done).length;
    const allDone = doneCount === steps.length;
    if (allDone) return null;

    const nextStep = steps.find(s => !s.done);

    return (
        <section className="glass-card mb-4" data-tour="onboarding">
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

            <div className="mt-4 pt-3 flex flex-wrap items-center gap-x-5 gap-y-2" style={{ borderTop: '1px solid var(--glass-border)' }}>
                <StartTourButton label="Take a quick tour" />
                <Link
                    href="/help/how-hayflow-works"
                    className="inline-flex items-center gap-1.5 text-sm font-bold"
                    style={{ color: 'var(--primary)' }}
                >
                    <BookOpen size={15} />
                    New here? See how HayFlow works
                </Link>
            </div>
        </section>
    );
}
