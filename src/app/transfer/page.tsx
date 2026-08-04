import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect } from "next/navigation";
import TransferForm from "./TransferForm";
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

export default async function TransferPage({ searchParams }: { searchParams: Promise<{ stack?: string; source?: string }> }) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    const { canManageTickets } = await getPermissionFlags();
    // An instant transfer is an office action. Field users route through the ticket queue.
    if (!canManageTickets) redirect("/tickets/new");

    const data = await getData(orgId);
    const { stack: presetStack, source: presetSource } = await searchParams;

    const missingPrereqs: Array<{ href: string; label: string; icon: React.ReactNode; reason: string }> = [];
    if (data.stacks.length === 0) missingPrereqs.push({
        href: "/stacks/new",
        label: "Add a stack",
        icon: <Package className="w-7 h-7" />,
        reason: "A stack is the lot of hay you're moving — define one first.",
    });
    if (data.locations.length < 2) missingPrereqs.push({
        href: "/locations/new",
        label: "Add a barn",
        icon: <MapPin className="w-7 h-7" />,
        reason: "A transfer moves bales between two barns — you need at least two.",
    });

    return (
        <div>
            <PageHeader
                eyebrow="Move inventory"
                title="Transfer bales"
                subtitle="Move hay from one barn to another. No sale — inventory just changes location."
                backHref="/stacks"
                backLabel="Stacks"
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
                <TransferForm
                    stacks={data.stacks}
                    locations={data.locations}
                    inventory={data.inventory}
                    presetStackId={presetStack}
                    presetSourceId={presetSource}
                />
            )}
        </div>
    );
}
