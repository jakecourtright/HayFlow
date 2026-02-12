import { auth } from "@clerk/nextjs/server";

// ============ PERMISSION KEYS ============
// These must match the custom permissions created in the Clerk Dashboard.
// Format: org:<feature>:<action>

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

// ============ ROLE KEYS ============
export const Roles = {
    ADMIN: "org:admin",
    BOOKKEEPER: "org:bookkeeper",
    DRIVER: "org:driver",
} as const;

// ============ SERVER-SIDE HELPERS ============

/**
 * Check if the current user has a specific permission.
 * Must be called in a server component or server action.
 */
export async function checkPermission(permission: PermissionKey): Promise<boolean> {
    const { has } = await auth();
    return has({ permission } as any);
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
export async function checkRole(role: string): Promise<boolean> {
    const { has } = await auth();
    return has({ role } as any);
}

/**
 * Get a bag of boolean flags for common permissions.
 * Used in server components to pass as props to client components.
 */
export async function getPermissionFlags() {
    const { has } = await auth();
    return {
        canDeleteStacks: has({ permission: Permissions.STACKS_DELETE } as any),
        canDeleteLocations: has({ permission: Permissions.LOCATIONS_DELETE } as any),
        canWriteInventory: has({ permission: Permissions.INVENTORY_WRITE } as any),
        canManageTickets: has({ permission: Permissions.TICKETS_MANAGE } as any),
        canCreateTickets: has({ permission: Permissions.TICKETS_CREATE } as any),
        canManageInvoices: has({ permission: Permissions.INVOICES_MANAGE } as any),
        canManageUsers: has({ permission: Permissions.USERS_MANAGE } as any),
        // Role checks for nav visibility
        isAdmin: has({ role: Roles.ADMIN } as any),
        isBookkeeper: has({ role: Roles.BOOKKEEPER } as any),
        isDriver: has({ role: Roles.DRIVER } as any),
    };
}
