import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, MapPin } from "lucide-react";
import LocationCard from "./LocationCard";
import { getDefaultWeight } from "@/lib/units";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

async function getLocationsWithInventory(orgId: string) {
    const client = await pool.connect();
    try {
        const locations = await client.query(
            'SELECT * FROM locations WHERE org_id = $1 ORDER BY name ASC',
            [orgId]
        );

        const inventoryQuery = await client.query(`
            SELECT
                t.location_id,
                t.stack_id,
                s.weight_per_bale,
                s.bale_size,
                COALESCE(SUM(
                    CASE
                        WHEN t.type IN ('production', 'purchase', 'transfer_in', 'adjustment') THEN t.amount
                        WHEN t.type IN ('sale', 'transfer_out') THEN -t.amount
                        ELSE 0
                    END
                ), 0) as stock
            FROM transactions t
            LEFT JOIN stacks s ON s.id = t.stack_id
            WHERE t.org_id = $1 AND t.location_id IS NOT NULL
            GROUP BY t.location_id, t.stack_id, s.weight_per_bale, s.bale_size
        `, [orgId]);

        const inventoryMap: Record<string, { total_stock: number; stack_count: number; total_tons: number }> = {};
        inventoryQuery.rows.forEach((row: any) => {
            const locId = row.location_id;
            const stock = parseFloat(row.stock) || 0;
            const weight = row.weight_per_bale || getDefaultWeight(row.bale_size || '3x4');
            const tons = (stock * weight) / 2000;

            if (!inventoryMap[locId]) {
                inventoryMap[locId] = { total_stock: 0, stack_count: 0, total_tons: 0 };
            }
            inventoryMap[locId].total_stock += stock;
            inventoryMap[locId].total_tons += tons;
            if (stock > 0) inventoryMap[locId].stack_count += 1;
        });

        return locations.rows.map((loc: any) => ({
            ...loc,
            total_stock: inventoryMap[loc.id]?.total_stock || 0,
            stack_count: inventoryMap[loc.id]?.stack_count || 0,
            total_tons: inventoryMap[loc.id]?.total_tons || 0,
        }));
    } finally {
        client.release();
    }
}

export default async function LocationsPage() {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    const locations = await getLocationsWithInventory(orgId);

    return (
        <div>
            <PageHeader
                title="Locations"
                subtitle="Every barn, yard, or field where inventory lives."
                actions={
                    <Link href="/locations/new" className="btn btn-primary btn-sm">
                        <Plus size={16} />
                        <span className="hidden sm:inline">Add location</span>
                        <span className="sm:hidden">Add</span>
                    </Link>
                }
            />

            {locations.length === 0 ? (
                <EmptyState
                    icon={<MapPin className="w-7 h-7" />}
                    title="No locations yet"
                    body="Locations tell HayFlow where every bale lives. Add your main barn or yard to get started."
                    ctaHref="/locations/new"
                    ctaLabel="Add your first location"
                />
            ) : (
                <div className="space-y-3">
                    {locations.map((loc: any) => (
                        <LocationCard key={loc.id} location={loc} />
                    ))}
                </div>
            )}
        </div>
    );
}
