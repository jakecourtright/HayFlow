import { auth, clerkClient } from "@clerk/nextjs/server";
import { cache } from "react";
import pool from "@/lib/db";

// ============ PERMISSION KEYS ============
// App-level permission identifiers. Historically these mirrored Clerk custom
// permissions; enforcement now lives entirely in this file (see ROLE_PERMISSIONS).

export const Permissions = {
    USERS_MANAGE: "org:users:manage",
    STACKS_DELETE: "org:stacks:delete",
    LOCATIONS_DELETE: "org:locations:delete",
    TICKETS_CREATE: "org:tickets:create",
    TICKETS_MANAGE: "org:tickets:manage",
    INVOICES_MANAGE: "org:invoices:manage",
    INVENTORY_WRITE: "org:inventory:write",
} as const;

export type PermissionKey = (typeof Permissions)[keyof typeof Permissions];

// ============ ROLES ============
// Roles are stored in Postgres (org_member_roles), not Clerk — Clerk's custom
// role sets require the $100/mo B2B add-on. Clerk keeps authN, sessions, and
// org membership; each member maps to exactly one app role below.

export const Roles = {
    ADMIN: "admin",
    BOOKKEEPER: "bookkeeper",
    DRIVER: "driver",
} as const;

export type AppRole = (typeof Roles)[keyof typeof Roles];

export const APP_ROLES = [Roles.ADMIN, Roles.BOOKKEEPER, Roles.DRIVER] as const;

// Single source of truth for the permission matrix (mirrors docs/roles-and-permissions.md).
const ROLE_PERMISSIONS: Record<AppRole, ReadonlySet<PermissionKey>> = {
    [Roles.ADMIN]: new Set<PermissionKey>(Object.values(Permissions)),
    [Roles.BOOKKEEPER]: new Set<PermissionKey>([
        Permissions.TICKETS_CREATE,
        Permissions.TICKETS_MANAGE,
        Permissions.INVOICES_MANAGE,
        Permissions.INVENTORY_WRITE,
    ]),
    [Roles.DRIVER]: new Set<PermissionKey>([Permissions.TICKETS_CREATE]),
};

export function isAppRole(value: unknown): value is AppRole {
    return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}

/**
 * Map a Clerk org-role claim to an app role. Covers members who predate the
 * org_member_roles table (legacy custom roles from the dev instance) and
 * org creators, who get Clerk's built-in org:admin.
 */
function roleFromClerkClaim(orgRole: string | null | undefined): AppRole | null {
    switch (orgRole) {
        case "org:admin":
            return Roles.ADMIN;
        case "org:bookkeeper":
            return Roles.BOOKKEEPER;
        case "org:driver":
            return Roles.DRIVER;
        default:
            return null;
    }
}

/**
 * Look up (and consume) the role recorded when this user was invited, matching
 * on any of their verified email addresses. Returns null if none was recorded
 * or the Clerk lookup fails — callers fall through to other derivations.
 */
async function consumeInvitedRole(
    client: { query: (sql: string, params: unknown[]) => Promise<{ rows: any[] }> },
    orgId: string,
    userId: string
): Promise<AppRole | null> {
    try {
        const clerk = await clerkClient();
        const user = await clerk.users.getUser(userId);
        const emails = user.emailAddresses.map((e) => e.emailAddress.toLowerCase());
        if (emails.length === 0) return null;
        const res = await client.query(
            `DELETE FROM org_invited_roles WHERE org_id = $1 AND lower(email) = ANY($2) RETURNING role`,
            [orgId, emails]
        );
        const role = res.rows[0]?.role;
        return isAppRole(role) ? role : null;
    } catch {
        return null;
    }
}

/**
 * Resolve the current user's app role for the active org. The first request
 * for a member lazily migrates them into org_member_roles:
 *   1. an explicit org_member_roles row always wins;
 *   2. else the role recorded when they were invited (org_invited_roles);
 *   3. else their Clerk org-role claim (legacy custom roles / org creators);
 *   4. else driver (least privilege).
 */
async function resolveRole(): Promise<AppRole | null> {
    const { userId, orgId, orgRole } = await auth();
    if (!userId || !orgId) return null;

    const client = await pool.connect();
    try {
        const existing = await client.query(
            "SELECT role FROM org_member_roles WHERE org_id = $1 AND user_id = $2",
            [orgId, userId]
        );
        if (isAppRole(existing.rows[0]?.role)) return existing.rows[0].role;

        const derived =
            (await consumeInvitedRole(client, orgId, userId)) ??
            roleFromClerkClaim(orgRole) ??
            Roles.DRIVER;

        // Race-safe: concurrent first requests may both derive; the winner's row sticks.
        await client.query(
            `INSERT INTO org_member_roles (org_id, user_id, role) VALUES ($1, $2, $3)
             ON CONFLICT (org_id, user_id) DO NOTHING`,
            [orgId, userId, derived]
        );
        const reread = await client.query(
            "SELECT role FROM org_member_roles WHERE org_id = $1 AND user_id = $2",
            [orgId, userId]
        );
        return isAppRole(reread.rows[0]?.role) ? reread.rows[0].role : derived;
    } finally {
        client.release();
    }
}

/**
 * The current user's app role for the active org (null when signed out or no
 * org selected). Memoized per request so repeated checks cost one query.
 */
export const getRole = cache(resolveRole);

/**
 * Check if the current user has a specific permission.
 * Must be called in a server component or server action.
 */
export async function checkPermission(permission: PermissionKey): Promise<boolean> {
    const role = await getRole();
    return role !== null && ROLE_PERMISSIONS[role].has(permission);
}

/**
 * Require a permission, throwing an error if the user doesn't have it.
 * Used in server actions for enforcement.
 */
export async function requirePermission(permission: PermissionKey): Promise<void> {
    const allowed = await checkPermission(permission);
    if (!allowed) {
        throw new Error(`Forbidden: missing permission ${permission}`);
    }
}

/**
 * Check if the current user has a specific role.
 * Useful for UI gating where you need to know the role.
 */
export async function checkRole(role: AppRole): Promise<boolean> {
    return (await getRole()) === role;
}

/**
 * Get a bag of boolean flags for common permissions.
 * Used in server components to pass as props to client components.
 */
export async function getPermissionFlags() {
    const role = await getRole();
    const can = (p: PermissionKey) => role !== null && ROLE_PERMISSIONS[role].has(p);
    return {
        canDeleteStacks: can(Permissions.STACKS_DELETE),
        canDeleteLocations: can(Permissions.LOCATIONS_DELETE),
        canWriteInventory: can(Permissions.INVENTORY_WRITE),
        canManageTickets: can(Permissions.TICKETS_MANAGE),
        canCreateTickets: can(Permissions.TICKETS_CREATE),
        canManageInvoices: can(Permissions.INVOICES_MANAGE),
        canManageUsers: can(Permissions.USERS_MANAGE),
        // Role checks for nav visibility
        isAdmin: role === Roles.ADMIN,
        isBookkeeper: role === Roles.BOOKKEEPER,
        isDriver: role === Roles.DRIVER,
    };
}
