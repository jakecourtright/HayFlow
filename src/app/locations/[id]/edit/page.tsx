import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { updateLocation } from "@/app/actions";
import DeleteButton from "./DeleteButton";
import UnitSelect from "@/components/UnitSelect";
import { getPermissionFlags } from "@/lib/permissions";
import PageHeader from "@/components/ui/PageHeader";
import SubmitButton from "@/components/ui/SubmitButton";

async function getLocation(locationId: string, orgId: string) {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT * FROM locations WHERE id = $1 AND org_id = $2',
            [locationId, orgId]
        );
        return result.rows[0] || null;
    } finally {
        client.release();
    }
}

export default async function EditLocationPage({ params }: { params: Promise<{ id: string }> }) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    const { id } = await params;
    const location = await getLocation(id, orgId);
    const perms = await getPermissionFlags();

    if (!location) notFound();

    const updateWithId = updateLocation.bind(null, id);

    return (
        <div>
            <PageHeader
                eyebrow="Edit location"
                title={location.name}
                backHref={`/locations/${location.id}`}
                backLabel="Location"
            />

            <form action={updateWithId} className="surface-card space-y-5">
                <div>
                    <label className="label-modern">Location name</label>
                    <input
                        type="text"
                        name="name"
                        required
                        defaultValue={location.name}
                        className="input-modern"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="label-modern">Capacity</label>
                        <input
                            type="number"
                            name="capacity"
                            required
                            min="1"
                            inputMode="numeric"
                            defaultValue={location.capacity}
                            className="input-modern"
                        />
                    </div>
                    <div>
                        <label className="label-modern">Unit</label>
                        <UnitSelect name="unit" defaultValue={location.unit} />
                    </div>
                </div>

                <SubmitButton className="w-full" pendingLabel="Saving…">
                    Save changes
                </SubmitButton>
            </form>

            {perms.canDeleteLocations && (
                <div className="mt-6">
                    <DeleteButton locationId={id} />
                </div>
            )}
        </div>
    );
}
