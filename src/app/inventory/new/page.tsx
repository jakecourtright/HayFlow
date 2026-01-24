import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function createLocation(formData: FormData) {
    'use server';
    const { userId, orgId } = await auth();
    if (!userId || !orgId) return;

    const name = formData.get('name');
    const capacity = formData.get('capacity');
    const unit = formData.get('unit') || 'bales';

    const client = await pool.connect();
    try {
        await client.query(
            'INSERT INTO locations (name, capacity, unit, user_id, org_id) VALUES ($1, $2, $3, $4, $5)',
            [name, capacity, unit, userId, orgId]
        );
    } finally {
        client.release();
    }
    revalidatePath('/inventory');
    redirect('/inventory');
}

export default async function NewLocationPage() {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    return (
        <div className="max-w-md mx-auto">
            <h1 className="text-xl font-bold mb-6">Add New Location</h1>

            <form action={createLocation} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Location Name</label>
                    <input type="text" name="name" required className="bg-slate-800 border border-white/10 rounded-xl p-3 w-full text-white focus:outline-none focus:border-emerald-500" placeholder="e.g. Barn A" />
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Capacity</label>
                    <input type="number" name="capacity" required className="bg-slate-800 border border-white/10 rounded-xl p-3 w-full text-white focus:outline-none focus:border-emerald-500" placeholder="2000" />
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Unit</label>
                    <select name="unit" className="bg-slate-800 border border-white/10 rounded-xl p-3 w-full text-white focus:outline-none focus:border-emerald-500">
                        <option value="bales">Bales</option>
                        <option value="tons">Tons</option>
                        <option value="loads">Loads</option>
                    </select>
                </div>

                <button type="submit" className="btn btn-primary w-full mt-4">
                    Create Location
                </button>
            </form>
        </div>
    );
}
