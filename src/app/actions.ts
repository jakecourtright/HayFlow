'use server';

import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function submitTransaction(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const type = formData.get('type') as string;
    const stackId = formData.get('stackId');
    const locationId = formData.get('locationId');
    const amount = formData.get('amount');
    const unit = formData.get('unit') || 'bales';
    const entity = formData.get('entity');
    const price = formData.get('price');

    if (!stackId || !amount || !type) {
        throw new Error("Missing required fields");
    }

    const client = await pool.connect();
    try {
        // Validation for sales: Check if enough stock exists
        if (type === 'sale') {
            if (!locationId || locationId === 'none') {
                throw new Error("Source location is required for sales");
            }

            const inventoryRes = await client.query(`
                SELECT 
                    SUM(CASE 
                        WHEN type IN ('production', 'purchase') THEN amount 
                        WHEN type IN ('sale') THEN -amount 
                        ELSE 0 
                    END) as quantity
                FROM transactions
                WHERE stack_id = $1 AND location_id = $2
            `, [stackId, locationId]);

            const currentStock = parseFloat(inventoryRes.rows[0]?.quantity || '0');
            const saleAmount = parseFloat(amount as string);

            if (currentStock < saleAmount) {
                // Formatting number for error message
                throw new Error(`Insufficient funds. Available: ${currentStock}, Requested: ${saleAmount}`);
            }
        }

        await client.query(`
            INSERT INTO transactions (type, stack_id, location_id, amount, unit, entity, price, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            type,
            stackId,
            locationId === 'none' ? null : locationId,
            parseFloat(amount as string),
            unit,
            entity,
            price ? parseFloat(price as string) : 0,
            session.user.id
        ]);
    } catch (e) {
        console.error(e);
        throw new Error("Failed to submit transaction");
    } finally {
        client.release();
    }

    revalidatePath('/');
    revalidatePath('/inventory');
    revalidatePath('/log');
    revalidatePath('/locations');
}

// ============ LOCATION ACTIONS ============

export async function createLocation(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const name = formData.get('name') as string;
    const capacity = formData.get('capacity') as string;
    const unit = formData.get('unit') as string || 'bales';

    if (!name || !capacity) {
        throw new Error("Missing required fields");
    }

    const client = await pool.connect();
    try {
        await client.query(`
            INSERT INTO locations (name, capacity, unit, user_id)
            VALUES ($1, $2, $3, $4)
        `, [name, parseInt(capacity), unit, session.user.id]);
    } catch (e) {
        console.error(e);
        throw new Error("Failed to create location");
    } finally {
        client.release();
    }

    revalidatePath('/locations');
    redirect('/locations');
}

export async function updateLocation(id: string, formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const name = formData.get('name') as string;
    const capacity = formData.get('capacity') as string;
    const unit = formData.get('unit') as string || 'bales';

    if (!name || !capacity) {
        throw new Error("Missing required fields");
    }

    const client = await pool.connect();
    try {
        await client.query(`
            UPDATE locations SET name = $1, capacity = $2, unit = $3
            WHERE id = $4 AND user_id = $5
        `, [name, parseInt(capacity), unit, id, session.user.id]);
    } catch (e) {
        console.error(e);
        throw new Error("Failed to update location");
    } finally {
        client.release();
    }

    revalidatePath('/locations');
    revalidatePath(`/locations/${id}`);
    redirect('/locations');
}

export async function deleteLocation(id: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const client = await pool.connect();
    try {
        // Check if location has transactions
        const check = await client.query(
            'SELECT COUNT(*) FROM transactions WHERE location_id = $1',
            [id]
        );
        if (parseInt(check.rows[0].count) > 0) {
            throw new Error("Cannot delete location with transaction history");
        }

        await client.query(
            'DELETE FROM locations WHERE id = $1 AND user_id = $2',
            [id, session.user.id]
        );
    } catch (e) {
        console.error(e);
        throw e;
    } finally {
        client.release();
    }

    revalidatePath('/locations');
    redirect('/locations');
}

// ============ STACK ACTIONS ============

export async function createStack(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const name = formData.get('name') as string;
    const commodity = formData.get('commodity') as string;
    const baleSize = formData.get('baleSize') as string;
    const quality = formData.get('quality') as string;
    const basePrice = formData.get('basePrice') as string;

    if (!name || !commodity) {
        throw new Error("Missing required fields");
    }

    const client = await pool.connect();
    try {
        await client.query(`
            INSERT INTO stacks (name, commodity, bale_size, quality, base_price, user_id)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [name, commodity, baleSize, quality, parseFloat(basePrice || '0'), session.user.id]);
    } catch (e) {
        console.error(e);
        throw new Error("Failed to create stack");
    } finally {
        client.release();
    }

    revalidatePath('/stacks');
    redirect('/stacks');
}

export async function updateStack(id: string, formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const name = formData.get('name') as string;
    const commodity = formData.get('commodity') as string;
    const baleSize = formData.get('baleSize') as string;
    const quality = formData.get('quality') as string;
    const basePrice = formData.get('basePrice') as string;

    if (!name || !commodity) {
        throw new Error("Missing required fields");
    }

    const client = await pool.connect();
    try {
        await client.query(`
            UPDATE stacks SET name = $1, commodity = $2, bale_size = $3, quality = $4, base_price = $5
            WHERE id = $6 AND user_id = $7
        `, [name, commodity, baleSize, quality, parseFloat(basePrice || '0'), id, session.user.id]);
    } catch (e) {
        console.error(e);
        throw new Error("Failed to update stack");
    } finally {
        client.release();
    }

    revalidatePath('/stacks');
    revalidatePath(`/stacks/${id}`);
    redirect('/stacks');
}

export async function deleteStack(id: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const client = await pool.connect();
    try {
        await client.query(
            'DELETE FROM stacks WHERE id = $1 AND user_id = $2',
            [id, session.user.id]
        );
    } catch (e) {
        console.error(e);
        throw new Error("Failed to delete stack");
    } finally {
        client.release();
    }

    revalidatePath('/stacks');
    revalidatePath('/');
    redirect('/stacks');
}

