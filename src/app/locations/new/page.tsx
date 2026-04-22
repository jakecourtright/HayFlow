import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createLocation } from "@/app/actions";
import UnitSelect from "@/components/UnitSelect";
import PageHeader from "@/components/ui/PageHeader";
import SubmitButton from "@/components/ui/SubmitButton";

export default async function NewLocationPage() {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    return (
        <div>
            <PageHeader
                eyebrow="New location"
                title="Add a place to store bales"
                subtitle="Barn, yard, field — anywhere you track inventory."
                backHref="/locations"
                backLabel="Locations"
            />

            <form action={createLocation} className="surface-card space-y-5">
                <div>
                    <label className="label-modern">Location name</label>
                    <input
                        type="text"
                        name="name"
                        required
                        placeholder="e.g. Barn A, North Field"
                        className="input-modern"
                        autoFocus
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
                            placeholder="2000"
                            className="input-modern"
                        />
                    </div>
                    <div>
                        <label className="label-modern">Unit</label>
                        <UnitSelect name="unit" />
                    </div>
                </div>

                <SubmitButton className="w-full" pendingLabel="Creating location…">
                    Create location
                </SubmitButton>

                <p className="text-xs text-center" style={{ color: 'var(--text-dim)' }}>
                    Capacity helps you see how full each location is — you can update it anytime.
                </p>
            </form>
        </div>
    );
}
