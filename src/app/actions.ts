'use server';

import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { tonsToBales, getDefaultWeight, normalizePrice } from "@/lib/units";

export async function submitTransaction(formData: FormData) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) throw new Error("Unauthorized");

    const type = formData.get('type') as string;
    const stackId = formData.get('stackId');
    const locationId = formData.get('locationId');
    const enteredAmount = formData.get('amount');
    const unit = formData.get('unit') as string || 'bales';
    const entity = formData.get('entity');
    const enteredPrice = formData.get('price');
    const priceUnit = formData.get('priceUnit') as string || 'ton'; // Price unit from form

    if (!stackId || !enteredAmount || !type) {
        throw new Error("Missing required fields");
    }

    const client = await pool.connect();
    try {
        // Get stack info to get weight per bale for conversion
        const stackResult = await client.query(
            'SELECT weight_per_bale, bale_size FROM stacks WHERE id = $1 AND org_id = $2',
            [stackId, orgId]
        );

        if (stackResult.rows.length === 0) {
            throw new Error("Stack not found");
        }

        const stack = stackResult.rows[0];
        const weightPerBale = stack.weight_per_bale || getDefaultWeight(stack.bale_size || '3x4');

        // Convert tons to bales if needed (always store as bales)
        let amountInBales = parseFloat(enteredAmount as string);
        if (unit === 'tons') {
            amountInBales = tonsToBales(amountInBales, weightPerBale);
        }

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

            if (currentStock < amountInBales) {
                throw new Error(`Insufficient stock. Available: ${currentStock} bales, Requested: ${amountInBales} bales`);
            }
        }

        // Normalize price to $/ton (base unit for reporting)
        let pricePerTon = 0;
        if (enteredPrice) {
            const priceValue = parseFloat(enteredPrice as string);
            pricePerTon = normalizePrice(priceValue, priceUnit as 'bale' | 'ton', weightPerBale);
        }

        await client.query(`
            INSERT INTO transactions (type, stack_id, location_id, amount, unit, entity, price, user_id, org_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
            type,
            stackId,
            locationId === 'none' ? null : locationId,
            amountInBales, // Always stored in bales
            'bales', // Always store as bales
            entity,
            pricePerTon, // Always stored as $/ton
            userId,
            orgId
        ]);
    } finally {
        client.release();
    }

    revalidatePath('/');
    revalidatePath('/inventory');
    revalidatePath('/log');
    revalidatePath('/locations');
    revalidatePath('/transactions');
}

export async function updateTransaction(id: string, formData: FormData) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) throw new Error("Unauthorized");

    const type = formData.get('type') as string;
    const stackId = formData.get('stackId');
    const locationId = formData.get('locationId');
    const enteredAmount = formData.get('amount');
    const unit = formData.get('unit') as string || 'bales';
    const entity = formData.get('entity');
    const enteredPrice = formData.get('price');
    const priceUnit = formData.get('priceUnit') as string || 'ton';

    if (!stackId || !enteredAmount || !type) {
        throw new Error("Missing required fields");
    }

    const client = await pool.connect();
    try {
        // Get stack info to get weight per bale for conversion
        const stackResult = await client.query(
            'SELECT weight_per_bale, bale_size FROM stacks WHERE id = $1 AND org_id = $2',
            [stackId, orgId]
        );

        if (stackResult.rows.length === 0) {
            throw new Error("Stack not found");
        }

        const stack = stackResult.rows[0];
        const weightPerBale = stack.weight_per_bale || getDefaultWeight(stack.bale_size || '3x4');

        // Convert tons to bales if needed
        let amountInBales = parseFloat(enteredAmount as string);
        if (unit === 'tons') {
            amountInBales = tonsToBales(amountInBales, weightPerBale);
        }

        // Normalize price to $/ton
        let pricePerTon = 0;
        if (enteredPrice) {
            const priceValue = parseFloat(enteredPrice as string);
            pricePerTon = normalizePrice(priceValue, priceUnit as 'bale' | 'ton', weightPerBale);
        }

        await client.query(`
            UPDATE transactions SET
                type = $1,
                stack_id = $2,
                location_id = $3,
                amount = $4,
                unit = $5,
                entity = $6,
                price = $7
            WHERE id = $8 AND org_id = $9
        `, [
            type,
            stackId,
            locationId === 'none' ? null : locationId,
            amountInBales,
            'bales',
            entity,
            pricePerTon,
            id,
            orgId
        ]);
    } finally {
        client.release();
    }

    revalidatePath('/');
    revalidatePath('/inventory');
    revalidatePath('/transactions');
    revalidatePath('/locations');
    redirect(`/transactions/${id}`);
}

export async function deleteTransaction(id: string) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) throw new Error("Unauthorized");

    const client = await pool.connect();
    try {
        await client.query(
            'DELETE FROM transactions WHERE id = $1 AND org_id = $2',
            [id, orgId]
        );
    } finally {
        client.release();
    }

    revalidatePath('/');
    revalidatePath('/inventory');
    revalidatePath('/transactions');
    revalidatePath('/locations');
    redirect('/transactions');
}

// ============ LOCATION ACTIONS ============

export async function createLocation(formData: FormData) {
    const { userId, orgId } = await auth();
    if (!userId) throw new Error("Not authenticated - please sign in");
    if (!orgId) throw new Error("No organization selected - please select an organization");

    const name = formData.get('name') as string;
    const capacity = formData.get('capacity') as string;
    const unit = formData.get('unit') as string || 'bales';

    if (!name) throw new Error("Location name is required");
    if (!capacity) throw new Error("Capacity is required");

    const capacityNum = parseInt(capacity);
    if (isNaN(capacityNum)) throw new Error("Capacity must be a valid number");

    const client = await pool.connect();
    try {
        await client.query(`
            INSERT INTO locations (name, capacity, unit, user_id, org_id)
            VALUES ($1, $2, $3, $4, $5)
        `, [name, capacityNum, unit, userId, orgId]);
    } finally {
        client.release();
    }

    revalidatePath('/locations');
    redirect('/locations');
}

export async function updateLocation(id: string, formData: FormData) {
    const { userId, orgId } = await auth();
    if (!userId) throw new Error("Not authenticated - please sign in");
    if (!orgId) throw new Error("No organization selected - please select an organization");

    const name = formData.get('name') as string;
    const capacity = formData.get('capacity') as string;
    const unit = formData.get('unit') as string || 'bales';

    if (!name) throw new Error("Location name is required");
    if (!capacity) throw new Error("Capacity is required");

    const capacityNum = parseInt(capacity);
    if (isNaN(capacityNum)) throw new Error("Capacity must be a valid number");

    const client = await pool.connect();
    try {
        await client.query(`
            UPDATE locations SET name = $1, capacity = $2, unit = $3
            WHERE id = $4 AND org_id = $5
        `, [name, capacityNum, unit, id, orgId]);
    } finally {
        client.release();
    }

    revalidatePath('/locations');
    revalidatePath(`/locations/${id}`);
    redirect('/locations');
}

export async function deleteLocation(id: string) {
    const { userId, orgId } = await auth();
    if (!userId) throw new Error("Not authenticated - please sign in");
    if (!orgId) throw new Error("No organization selected - please select an organization");

    const client = await pool.connect();
    try {
        // Check if location has transactions
        const check = await client.query(
            'SELECT COUNT(*) FROM transactions WHERE location_id = $1 AND org_id = $2',
            [id, orgId]
        );
        if (parseInt(check.rows[0].count) > 0) {
            throw new Error("Cannot delete location with transaction history");
        }

        await client.query(
            'DELETE FROM locations WHERE id = $1 AND org_id = $2',
            [id, orgId]
        );
    } finally {
        client.release();
    }

    revalidatePath('/locations');
    redirect('/locations');
}

// ============ STACK ACTIONS ============

export async function createStack(formData: FormData) {
    const { userId, orgId } = await auth();
    if (!userId) throw new Error("Not authenticated - please sign in");
    if (!orgId) throw new Error("No organization selected - please select an organization");

    const name = formData.get('name') as string;
    const commodity = formData.get('commodity') as string;
    const baleSize = formData.get('baleSize') as string;
    const quality = formData.get('quality') as string;
    const basePrice = formData.get('basePrice') as string;
    const weightPerBale = formData.get('weightPerBale') as string;
    const priceUnit = formData.get('priceUnit') as string || 'bale';

    if (!name) throw new Error("Stack name is required");
    if (!commodity) throw new Error("Commodity is required");

    const client = await pool.connect();
    try {
        await client.query(`
            INSERT INTO stacks (name, commodity, bale_size, quality, base_price, weight_per_bale, price_unit, user_id, org_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
            name,
            commodity,
            baleSize,
            quality,
            parseFloat(basePrice || '0'),
            weightPerBale ? parseInt(weightPerBale) : null,
            priceUnit,
            userId,
            orgId
        ]);
    } finally {
        client.release();
    }

    revalidatePath('/stacks');
    redirect('/stacks');
}

export async function updateStack(id: string, formData: FormData) {
    const { userId, orgId } = await auth();
    if (!userId) throw new Error("Not authenticated - please sign in");
    if (!orgId) throw new Error("No organization selected - please select an organization");

    const name = formData.get('name') as string;
    const commodity = formData.get('commodity') as string;
    const baleSize = formData.get('baleSize') as string;
    const quality = formData.get('quality') as string;
    const basePrice = formData.get('basePrice') as string;
    const weightPerBale = formData.get('weightPerBale') as string;
    const priceUnit = formData.get('priceUnit') as string || 'bale';

    if (!name) throw new Error("Stack name is required");
    if (!commodity) throw new Error("Commodity is required");

    const client = await pool.connect();
    try {
        await client.query(`
            UPDATE stacks SET 
                name = $1, 
                commodity = $2, 
                bale_size = $3, 
                quality = $4, 
                base_price = $5,
                weight_per_bale = $6,
                price_unit = $7
            WHERE id = $8 AND org_id = $9
        `, [
            name,
            commodity,
            baleSize,
            quality,
            parseFloat(basePrice || '0'),
            weightPerBale ? parseInt(weightPerBale) : null,
            priceUnit,
            id,
            orgId
        ]);
    } finally {
        client.release();
    }

    revalidatePath('/stacks');
    revalidatePath(`/stacks/${id}`);
    redirect('/stacks');
}

export async function deleteStack(id: string) {
    const { userId, orgId } = await auth();
    if (!userId) throw new Error("Not authenticated - please sign in");
    if (!orgId) throw new Error("No organization selected - please select an organization");

    const client = await pool.connect();
    try {
        await client.query(
            'DELETE FROM stacks WHERE id = $1 AND org_id = $2',
            [id, orgId]
        );
    } finally {
        client.release();
    }

    revalidatePath('/stacks');
    revalidatePath('/');
    redirect('/stacks');
}
