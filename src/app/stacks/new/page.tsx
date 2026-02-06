import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createStack } from "@/app/actions";

export default async function NewStackPage() {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    return (
        <div className="max-w-md mx-auto">
            <h1 className="text-xl font-bold mb-6">Create New Stack</h1>

            <form action={createStack} className="glass-card space-y-5">
                <div>
                    <label className="label-modern">Stack Name / Lot #</label>
                    <input type="text" name="name" required className="input-modern" placeholder="e.g. 2024-ALF-001" />
                </div>

                <div>
                    <label className="label-modern">Commodity</label>
                    <select name="commodity" className="select-modern">
                        <option value="Alfalfa">Alfalfa</option>
                        <option value="Timothy">Timothy</option>
                        <option value="Bermuda">Bermuda</option>
                        <option value="Oat Hay">Oat Hay</option>
                        <option value="Orchard Grass">Orchard Grass</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="label-modern">Bale Size</label>
                        <select name="baleSize" className="select-modern">
                            <option value="3x4x8">3x4x8 Large Sq</option>
                            <option value="3x3x8">3x3x8 Large Sq</option>
                            <option value="Round">Round</option>
                            <option value="Small Square">Small Square</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-modern">Quality</label>
                        <select name="quality" className="select-modern">
                            <option value="Premium">Premium</option>
                            <option value="#1">#1 (Good)</option>
                            <option value="Feeder">Feeder / Economy</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="label-modern">Base Price ($)</label>
                    <input type="number" name="basePrice" step="0.01" className="input-modern" placeholder="0.00" />
                </div>

                <button type="submit" className="btn btn-primary w-full mt-4">
                    Create Product
                </button>
            </form>
        </div>
    );
}
