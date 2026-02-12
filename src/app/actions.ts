'use server';

import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { tonsToBales, getDefaultWeight, normalizePrice } from "@/lib/units";
import { Permissions } from "@/lib/permissions";

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
    const { userId, orgId, has } = await auth();
    if (!userId) throw new Error("Not authenticated - please sign in");
    if (!orgId) throw new Error("No organization selected - please select an organization");

    if (!has({ permission: Permissions.LOCATIONS_DELETE } as any)) {
        throw new Error("You do not have permission to delete locations");
    }

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
    const { userId, orgId, has } = await auth();
    if (!userId) throw new Error("Not authenticated - please sign in");
    if (!orgId) throw new Error("No organization selected - please select an organization");

    if (!has({ permission: Permissions.STACKS_DELETE } as any)) {
        throw new Error("You do not have permission to delete stacks");
    }

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

// ============ DASHBOARD LAYOUT ACTIONS ============

export interface DashboardLayout {
    order: string[];
    hidden: string[];
}

const DEFAULT_LAYOUT: DashboardLayout = {
    order: ['total-stock', 'stock-by-commodity', 'sales-this-month', 'bales-moved', 'action-cards', 'recent-activity'],
    hidden: [],
};

export async function getDashboardLayout(): Promise<DashboardLayout> {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) return DEFAULT_LAYOUT;

    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT preference_value FROM user_preferences 
             WHERE user_id = $1 AND org_id = $2 AND preference_key = 'dashboard_layout'`,
            [userId, orgId]
        );
        if (result.rows.length > 0) {
            return result.rows[0].preference_value as DashboardLayout;
        }
        return DEFAULT_LAYOUT;
    } finally {
        client.release();
    }
}

export async function saveDashboardLayout(layout: DashboardLayout) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) throw new Error("Unauthorized");

    const client = await pool.connect();
    try {
        await client.query(`
            INSERT INTO user_preferences (user_id, org_id, preference_key, preference_value, updated_at)
            VALUES ($1, $2, 'dashboard_layout', $3, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, org_id, preference_key)
            DO UPDATE SET preference_value = $3, updated_at = CURRENT_TIMESTAMP
        `, [userId, orgId, JSON.stringify(layout)]);
    } finally {
        client.release();
    }

    revalidatePath('/');
}

// ============ TICKET ACTIONS ============

export async function createTicket(formData: FormData) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) throw new Error("Unauthorized");

    const stackId = formData.get('stackId') as string;
    const locationId = formData.get('locationId') as string;
    const amount = formData.get('amount') as string;
    const customer = formData.get('customer') as string;
    const notes = formData.get('notes') as string;

    if (!stackId || !amount) throw new Error("Stack and amount are required");

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) throw new Error("Amount must be a positive number");

    const client = await pool.connect();
    try {
        // Verify stock exists at this location
        if (locationId && locationId !== 'none') {
            const inventoryRes = await client.query(`
                SELECT 
                    SUM(CASE 
                        WHEN type IN ('production', 'purchase') THEN amount 
                        WHEN type IN ('sale') THEN -amount 
                        ELSE 0 
                    END) as quantity
                FROM transactions
                WHERE stack_id = $1 AND location_id = $2 AND org_id = $3
            `, [stackId, locationId, orgId]);

            const currentStock = parseFloat(inventoryRes.rows[0]?.quantity || '0');
            if (currentStock < amountNum) {
                throw new Error(`Insufficient stock. Available: ${currentStock} bales, Requested: ${amountNum} bales`);
            }
        }

        await client.query(`
            INSERT INTO tickets (stack_id, location_id, amount, customer, notes, status, driver_id, org_id)
            VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
        `, [
            stackId,
            locationId === 'none' ? null : locationId,
            amountNum,
            customer || null,
            notes || null,
            userId,
            orgId
        ]);
    } finally {
        client.release();
    }

    revalidatePath('/tickets');
    revalidatePath('/dispatch');
    redirect('/tickets');
}

export async function approveTicket(id: string) {
    const { userId, orgId, has } = await auth();
    if (!userId || !orgId) throw new Error("Unauthorized");

    if (!has({ permission: Permissions.TICKETS_MANAGE } as any)) {
        throw new Error("You do not have permission to manage tickets");
    }

    const client = await pool.connect();
    try {
        // Get ticket details
        const ticketRes = await client.query(
            'SELECT * FROM tickets WHERE id = $1 AND org_id = $2 AND status = $3',
            [id, orgId, 'pending']
        );
        if (ticketRes.rows.length === 0) {
            throw new Error("Ticket not found or already processed");
        }

        const ticket = ticketRes.rows[0];

        // Create a sale transaction to deduct inventory
        const txRes = await client.query(`
            INSERT INTO transactions (type, stack_id, location_id, amount, unit, entity, price, user_id, org_id)
            VALUES ('sale', $1, $2, $3, 'bales', $4, 0, $5, $6)
            RETURNING id
        `, [
            ticket.stack_id,
            ticket.location_id,
            ticket.amount,
            ticket.customer || 'Ticket #' + id,
            userId,
            orgId
        ]);

        const transactionId = txRes.rows[0].id;

        // Update ticket status and link transaction
        await client.query(`
            UPDATE tickets SET status = 'approved', transaction_id = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND org_id = $3
        `, [transactionId, id, orgId]);
    } finally {
        client.release();
    }

    revalidatePath('/tickets');
    revalidatePath('/dispatch');
    revalidatePath('/');
    revalidatePath('/inventory');
    revalidatePath('/locations');
    revalidatePath('/transactions');
}

export async function rejectTicket(id: string) {
    const { userId, orgId, has } = await auth();
    if (!userId || !orgId) throw new Error("Unauthorized");

    if (!has({ permission: Permissions.TICKETS_MANAGE } as any)) {
        throw new Error("You do not have permission to manage tickets");
    }

    const client = await pool.connect();
    try {
        const result = await client.query(`
            UPDATE tickets SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND org_id = $2 AND status = 'pending'
        `, [id, orgId]);

        if (result.rowCount === 0) {
            throw new Error("Ticket not found or already processed");
        }
    } finally {
        client.release();
    }

    revalidatePath('/tickets');
    revalidatePath('/dispatch');
}

export async function deleteTicket(id: string) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) throw new Error("Unauthorized");

    const client = await pool.connect();
    try {
        // Only allow deleting pending tickets, and only by the creator or someone with manage permission
        const ticketRes = await client.query(
            'SELECT * FROM tickets WHERE id = $1 AND org_id = $2',
            [id, orgId]
        );

        if (ticketRes.rows.length === 0) throw new Error("Ticket not found");

        const ticket = ticketRes.rows[0];
        if (ticket.status !== 'pending') {
            throw new Error("Only pending tickets can be deleted");
        }

        // Driver can only delete their own tickets
        if (ticket.driver_id !== userId) {
            const { has } = await auth();
            if (!has({ permission: Permissions.TICKETS_MANAGE } as any)) {
                throw new Error("You can only delete your own tickets");
            }
        }

        await client.query('DELETE FROM tickets WHERE id = $1 AND org_id = $2', [id, orgId]);
    } finally {
        client.release();
    }

    revalidatePath('/tickets');
    revalidatePath('/dispatch');
    redirect('/tickets');
}

// ============ INVOICE ACTIONS ============

export async function createInvoice(formData: FormData) {
    const { userId, orgId, has } = await auth();
    if (!userId || !orgId) throw new Error("Unauthorized");

    if (!has({ permission: Permissions.INVOICES_MANAGE } as any)) {
        throw new Error("You do not have permission to manage invoices");
    }

    const ticketIdsRaw = formData.get('ticketIds') as string;
    const customer = formData.get('customer') as string;
    const notes = formData.get('notes') as string;

    if (!ticketIdsRaw) throw new Error("No tickets selected");

    const ticketIds = ticketIdsRaw.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (ticketIds.length === 0) throw new Error("No valid tickets selected");

    const client = await pool.connect();
    try {
        // Verify all tickets are approved and belong to this org
        const ticketsRes = await client.query(
            `SELECT * FROM tickets WHERE id = ANY($1) AND org_id = $2 AND status = 'approved'`,
            [ticketIds, orgId]
        );

        if (ticketsRes.rows.length !== ticketIds.length) {
            throw new Error("Some tickets are not approved or not found");
        }

        // Generate invoice number
        const countRes = await client.query(
            'SELECT COUNT(*) FROM invoices WHERE org_id = $1',
            [orgId]
        );
        const invoiceNumber = `INV-${String(parseInt(countRes.rows[0].count) + 1).padStart(4, '0')}`;

        // Calculate total (sum of ticket amounts - in bales for now, pricing TBD)
        const totalAmount = ticketsRes.rows.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

        // Create invoice
        const invoiceRes = await client.query(`
            INSERT INTO invoices (invoice_number, customer, status, total_amount, notes, created_by, org_id)
            VALUES ($1, $2, 'draft', $3, $4, $5, $6)
            RETURNING id
        `, [invoiceNumber, customer || null, totalAmount, notes || null, userId, orgId]);

        const invoiceId = invoiceRes.rows[0].id;

        // Link tickets to invoice
        await client.query(`
            UPDATE tickets SET invoice_id = $1, status = 'invoiced', updated_at = CURRENT_TIMESTAMP
            WHERE id = ANY($2) AND org_id = $3
        `, [invoiceId, ticketIds, orgId]);
    } finally {
        client.release();
    }

    revalidatePath('/tickets');
    revalidatePath('/dispatch');
    redirect('/dispatch/invoices');
}

export async function updateInvoiceStatus(id: string, status: string) {
    const { userId, orgId, has } = await auth();
    if (!userId || !orgId) throw new Error("Unauthorized");

    if (!has({ permission: Permissions.INVOICES_MANAGE } as any)) {
        throw new Error("You do not have permission to manage invoices");
    }

    const validStatuses = ['draft', 'sent', 'paid'];
    if (!validStatuses.includes(status)) throw new Error("Invalid status");

    const client = await pool.connect();
    try {
        await client.query(`
            UPDATE invoices SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND org_id = $3
        `, [status, id, orgId]);
    } finally {
        client.release();
    }

    revalidatePath('/dispatch');
    revalidatePath('/dispatch/invoices');
    revalidatePath(`/dispatch/invoices/${id}`);
}
