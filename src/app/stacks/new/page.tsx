import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function createStack(formData: FormData) {
    'use server';
    const session = await auth();
    if (!session?.user?.id) return;

    const client = await pool.connect();
    try {
        await client.query(
            'INSERT INTO stacks (name, commodity, bale_size, quality, base_price, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
            [
                formData.get('name'),
                formData.get('commodity'),
                formData.get('baleSize'),
                formData.get('quality'),
                parseFloat(formData.get('basePrice') as string || '0'),
                session.user.id
            ]
        );
    } finally {
        client.release();
    }
    revalidatePath('/stacks');
    redirect('/stacks');
}

export default async function NewStackPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/api/auth/signin");

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
