import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";

/**
 * Clerk plan key — must match the plan slug you create in Clerk Dashboard → Billing.
 * Single tier at $20/mo with 14-day trial + CC required upfront.
 */
export const BILLING_PLAN_KEY = "pro";
export const TRIAL_DAYS = 14;

export type SubscriptionState =
    | { kind: "active"; trialing: boolean; trialDaysLeft: number | null }
    | { kind: "inactive" }
    | { kind: "no-org" };

function parseIdList(raw: string | undefined): Set<string> {
    if (!raw) return new Set();
    return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
}

/**
 * Pre-launch bypass for internal/test accounts. Reads comma-separated IDs from
 * BILLING_BYPASS_USER_IDS and BILLING_BYPASS_ORG_IDS. A hit on either list
 * makes the org behave as if it has an active (non-trialing) subscription.
 * Safe to leave empty in prod.
 */
export async function isBillingBypassed(): Promise<boolean> {
    const { userId, orgId } = await auth();
    if (!userId && !orgId) return false;
    const userAllow = parseIdList(process.env.BILLING_BYPASS_USER_IDS);
    const orgAllow = parseIdList(process.env.BILLING_BYPASS_ORG_IDS);
    if (userId && userAllow.has(userId)) return true;
    if (orgId && orgAllow.has(orgId)) return true;
    return false;
}

/**
 * Idempotent: creates an org_billing row the first time we see an org.
 * Used to compute trial countdown locally (Clerk Billing is source of truth for gating).
 */
export async function ensureOrgBillingRow(orgId: string): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query(
            `INSERT INTO org_billing (org_id) VALUES ($1) ON CONFLICT (org_id) DO NOTHING`,
            [orgId]
        );
    } finally {
        client.release();
    }
}

async function getTrialStartedAt(orgId: string): Promise<Date | null> {
    const client = await pool.connect();
    try {
        const res = await client.query(
            'SELECT trial_started_at FROM org_billing WHERE org_id = $1',
            [orgId]
        );
        return res.rows[0]?.trial_started_at ?? null;
    } finally {
        client.release();
    }
}

/**
 * Returns the current subscription state for the active org.
 * - active: has the Clerk plan (paying OR in trial). Includes trialDaysLeft when within window.
 * - inactive: no plan — user must visit /billing.
 * - no-org: signed out or no org selected.
 */
export async function getSubscriptionState(): Promise<SubscriptionState> {
    const { orgId, has } = await auth();
    if (!orgId) return { kind: "no-org" };

    await ensureOrgBillingRow(orgId);
    if (await isBillingBypassed()) {
        return { kind: "active", trialing: false, trialDaysLeft: null };
    }
    const hasPlan = has({ plan: BILLING_PLAN_KEY } as any);

    if (!hasPlan) return { kind: "inactive" };

    const trialStart = await getTrialStartedAt(orgId);
    if (!trialStart) return { kind: "active", trialing: false, trialDaysLeft: null };

    const msPerDay = 24 * 60 * 60 * 1000;
    const msElapsed = Date.now() - new Date(trialStart).getTime();
    const daysElapsed = Math.floor(msElapsed / msPerDay);
    const daysLeft = TRIAL_DAYS - daysElapsed;

    if (daysLeft > 0) {
        return { kind: "active", trialing: true, trialDaysLeft: daysLeft };
    }
    return { kind: "active", trialing: false, trialDaysLeft: null };
}

/**
 * Cheap boolean gate. True when the org has the Clerk plan (includes trial).
 */
export async function hasActiveSubscription(): Promise<boolean> {
    const { orgId, has } = await auth();
    if (!orgId) return false;
    if (await isBillingBypassed()) return true;
    return has({ plan: BILLING_PLAN_KEY } as any);
}

/**
 * Throws a SubscriptionRequired error if the org is not on an active plan.
 * Call at the top of write-path server actions (transactions, tickets, invoices, stacks, locations).
 * Catch this error in client UI and route the user to /billing.
 */
export async function requireActiveSubscription(): Promise<void> {
    const ok = await hasActiveSubscription();
    if (!ok) {
        throw new Error("SubscriptionRequired: Visit /billing to start or renew your subscription.");
    }
}
