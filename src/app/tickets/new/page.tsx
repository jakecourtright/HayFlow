import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import TicketForm from "./TicketForm";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { getPermissionFlags } from "@/lib/permissions";
import { Package, MapPin } from "lucide-react";

async function getData(orgId: string) {
    const client = await pool.connect();
    try {
        const stacks = await client.query('SELECT * FROM stacks WHERE org_id = $1 AND archived_at IS NULL ORDER BY name ASC', [orgId]);
        const locations = await client.query('SELECT * FROM locations WHERE org_id = $1 ORDER BY name ASC', [orgId]);

        const inventoryRes = await client.query(`
            SELECT
                stack_id,
                location_id,
                SUM(CASE
                    WHEN type IN ('production', 'purchase', 'transfer_in', 'adjustment') THEN amount
                    WHEN type IN ('sale', 'transfer_out') THEN -amount
                    ELSE 0
                END) as quantity
            FROM transactions
            WHERE org_id = $1 AND location_id IS NOT NULL
            GROUP BY stack_id, location_id
            HAVING SUM(CASE
                WHEN type IN ('production', 'purchase', 'transfer_in', 'adjustment') THEN amount
                WHEN type IN ('sale', 'transfer_out') THEN -amount
                ELSE 0
            END) > 0
        `, [orgId]);

        return {
            stacks: stacks.rows,
            locations: locations.rows,
            inventory: inventoryRes.rows,
        };
    } finally {
        client.release();
    }
}

export default async function NewTicketPage() {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    const { canManageInvoices } = await getPermissionFlags();
    const data = await getData(orgId);

    const missingPrereqs: Array<{ href: string; label: string; icon: React.ReactNode; reason: string }> = [];
    if (data.stacks.length === 0) missingPrereqs.push({
        href: "/stacks/new",
        label: "Add a stack",
        icon: <Package className="w-7 h-7" />,
        reason: "Stacks are the products you sell — define one before you can ticket it.",
    });
    if (data.locations.length === 0) missingPrereqs.push({
        href: "/locations/new",
        label: "Add a location",
        icon: <MapPin className="w-7 h-7" />,
        reason: "Every ticket tracks inventory between locations. Add a barn or yard first.",
    });

    return (
        <div>
            <PageHeader
                eyebrow="New ticket"
                title="Record a load"
                subtitle={canManageInvoices ? "Move bales between barns. To sell, use Quick Sale." : "Capture a sale to a customer or a barn-to-barn transfer."}
                backHref="/tickets"
                backLabel="Tickets"
            />

            {missingPrereqs.length > 0 ? (
                <div className="space-y-4">
                    {missingPrereqs.map((m) => (
                        <EmptyState
                            key={m.href}
                            icon={m.icon}
                            title={`${m.label} first`}
                            body={m.reason}
                            ctaHref={m.href}
                            ctaLabel={m.label}
                        />
                    ))}
                </div>
            ) : (
                <TicketForm stacks={data.stacks} locations={data.locations} inventory={data.inventory} canManageInvoices={canManageInvoices} />
            )}

            {data.stacks.length > 0 && data.locations.length === 0 && (
                <p className="text-xs text-center mt-4" style={{ color: "var(--text-dim)" }}>
                    Or <Link href="/locations/new" className="underline">add another location</Link>.
                </p>
            )}
        </div>
    );
}
