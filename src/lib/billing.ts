import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";

/**
 * Clerk plan keys — must match the plan slugs created in Clerk Dashboard → Billing.
 * Two tiers, both with 14-day trial + CC required upfront:
 *   - hayflow_pro:      $25/mo, up to 2 users
 *   - hayflow_pro_team: $100/mo, unlimited users
 * Any of these grants write access. Add new plan slugs here as the catalog grows.
 */
export const BILLING_PLAN_KEYS = ["hayflow_pro", "hayflow_pro_team"] as const;
/** Default plan key (used in copy / display fallbacks). */
export const BILLING_PLAN_KEY = BILLING_PLAN_KEYS[0];
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
 * Stamp trial_started_at = now() the first time we observe an active plan, so our
 * countdown begins at subscribe time (matching Clerk) rather than at org creation.
 * Guarded by `WHERE trial_started_at IS NULL` so it's idempotent and race-safe:
 * concurrent callers either win the UPDATE or read back the already-stamped value.
 */
async function startTrialClock(orgId: string): Promise<Date> {
    const client = await pool.connect();
    try {
        const res = await client.query(
            `UPDATE org_billing SET trial_started_at = now()
             WHERE org_id = $1 AND trial_started_at IS NULL
             RETURNING trial_started_at`,
            [orgId]
        );
        if (res.rows[0]?.trial_started_at) return res.rows[0].trial_started_at;
        const reread = await client.query(
            'SELECT trial_started_at FROM org_billing WHERE org_id = $1',
            [orgId]
        );
        return reread.rows[0]?.trial_started_at ?? new Date();
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
    const hasPlan = BILLING_PLAN_KEYS.some((plan) => has({ plan } as any));

    if (!hasPlan) return { kind: "inactive" };

    // Stamp the trial clock the first time we see an active plan, so the countdown
    // begins at subscribe time (matching Clerk) rather than at org creation.
    let trialStart = await getTrialStartedAt(orgId);
    if (!trialStart) trialStart = await startTrialClock(orgId);

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
    return BILLING_PLAN_KEYS.some((plan) => has({ plan } as any));
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
