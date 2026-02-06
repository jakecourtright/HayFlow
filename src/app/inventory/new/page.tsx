import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createLocation } from "@/app/actions";

export default async function NewLocationPage() {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    return (
        <div className="max-w-md mx-auto">
            <h1 className="text-xl font-bold mb-6">Add New Location</h1>

            <form action={createLocation} className="glass-card space-y-5">
                <div>
                    <label className="label-modern">Location Name</label>
                    <input
                        type="text"
                        name="name"
                        required
                        placeholder="e.g., Barn A"
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
                            placeholder="2000"
                            className="input-modern"
                        />
                    </div>
                    <div>
                        <label className="label-modern">Unit</label>
                        <select name="unit" className="select-modern">
                            <option value="bales">Bales</option>
                            <option value="tons">Tons</option>
                            <option value="loads">Loads</option>
                        </select>
                    </div>
                </div>

                <button type="submit" className="btn btn-primary w-full mt-4">
                    Create Location
                </button>
            </form>
        </div>
    );
}
