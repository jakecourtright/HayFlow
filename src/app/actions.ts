'use server';

import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { tonsToBales, getDefaultWeight, normalizePrice, lineAmount, resolveLineRate } from "@/lib/units";
import { Permissions, requirePermission } from "@/lib/permissions";
import { requireActiveSubscription } from "@/lib/billing";
import crypto from 'crypto';

export async function submitTransaction(formData: FormData) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) throw new Error("Unauthorized");
    await requireActiveSubscription();

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

        // Actual dollars for this line (revenue/cost) — single source of truth for reporting
        const lineTotal = (amountInBales * weightPerBale / 2000) * pricePerTon;

        await client.query(`
            INSERT INTO transactions (type, stack_id, location_id, amount, unit, entity, price, line_total, user_id, org_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
            type,
            stackId,
            locationId === 'none' ? null : locationId,
            amountInBales, // Always stored in bales
            'bales', // Always store as bales
            entity,
            pricePerTon, // Always stored as $/ton
            lineTotal, // Actual USD
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
    await requireActiveSubscription();

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

        // Keep actual-dollar line total in sync (single source of truth for reporting)
        const lineTotal = (amountInBales * weightPerBale / 2000) * pricePerTon;

        await client.query(`
            UPDATE transactions SET
                type = $1,
                stack_id = $2,
                location_id = $3,
                amount = $4,
                unit = $5,
                entity = $6,
                price = $7,
                line_total = $8
            WHERE id = $9 AND org_id = $10
        `, [
            type,
            stackId,
            locationId === 'none' ? null : locationId,
            amountInBales,
            'bales',
            entity,
            pricePerTon,
            lineTotal,
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
    await requireActiveSubscription();

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
    await requireActiveSubscription();

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
    await requireActiveSubscription();

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
    await requireActiveSubscription();

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
    await requireActiveSubscription();

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
    await requireActiveSubscription();

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
    await requireActiveSubscription();

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
    await requireActiveSubscription();

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
    await requireActiveSubscription();

    const ticketType = (formData.get('type') as string) || 'sale';
    const stackId = formData.get('stackId') as string;
    const locationId = formData.get('locationId') as string;
    const amount = formData.get('amount') as string;
    const customer = formData.get('customer') as string;
    const notes = formData.get('notes') as string;
    const netLbs = formData.get('netLbs') as string;
    const destinationId = formData.get('destinationId') as string;

    if (!stackId || !amount) throw new Error("Stack and amount are required");
    if (!locationId || locationId === 'none') throw new Error("Source location is required");

    if (ticketType === 'sale' && !customer?.trim()) {
        throw new Error("Customer is required for sale tickets");
    }
    if (ticketType === 'barn_to_barn' && (!destinationId || destinationId === 'none')) {
        throw new Error("Destination location is required for barn-to-barn tickets");
    }
    if (ticketType === 'barn_to_barn' && destinationId === locationId) {
        throw new Error("Source and destination locations must be different");
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) throw new Error("Amount must be a positive number");

    const netLbsNum = netLbs ? parseFloat(netLbs) : null;
    if (netLbs && (isNaN(netLbsNum!) || netLbsNum! <= 0)) {
        throw new Error("Net lbs must be a positive number");
    }

    const client = await pool.connect();
    try {
        // Verify stock exists at source location
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

        await client.query(`
            INSERT INTO tickets (type, stack_id, location_id, amount, customer, notes, net_lbs, destination_id, status, driver_id, org_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10)
        `, [
            ticketType,
            stackId,
            locationId,
            amountNum,
            ticketType === 'sale' ? (customer || null) : null,
            notes || null,
            ticketType === 'sale' ? netLbsNum : null,
            ticketType === 'barn_to_barn' ? (destinationId || null) : null,
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
    await requireActiveSubscription();

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
        let transactionId: number;

        if (ticket.type === 'barn_to_barn') {
            // Barn to Barn: create a sale (deduct from source) and a purchase (add to destination)
            const saleRes = await client.query(`
                INSERT INTO transactions (type, stack_id, location_id, amount, unit, entity, price, user_id, org_id)
                VALUES ('sale', $1, $2, $3, 'bales', $4, 0, $5, $6)
                RETURNING id
            `, [
                ticket.stack_id,
                ticket.location_id,
                ticket.amount,
                'Transfer to destination',
                userId,
                orgId
            ]);

            await client.query(`
                INSERT INTO transactions (type, stack_id, location_id, amount, unit, entity, price, user_id, org_id)
                VALUES ('purchase', $1, $2, $3, 'bales', $4, 0, $5, $6)
            `, [
                ticket.stack_id,
                ticket.destination_id,
                ticket.amount,
                'Transfer from source',
                userId,
                orgId
            ]);

            transactionId = saleRes.rows[0].id;
        } else {
            // Sale: create a sale transaction to deduct inventory
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

            transactionId = txRes.rows[0].id;
        }

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
    await requireActiveSubscription();

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
    await requireActiveSubscription();

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
    await requireActiveSubscription();

    if (!has({ permission: Permissions.INVOICES_MANAGE } as any)) {
        throw new Error("You do not have permission to manage invoices");
    }

    const ticketIdsRaw = formData.get('ticketIds') as string;
    const customer = formData.get('customer') as string;
    const notes = formData.get('notes') as string;
    const pricePerUnitStr = formData.get('pricePerUnit') as string;
    const priceUnit = (formData.get('priceUnit') as string) || 'ton';

    if (!ticketIdsRaw) throw new Error("No tickets selected");

    const ticketIds = ticketIdsRaw.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (ticketIds.length === 0) throw new Error("No valid tickets selected");

    const pricePerUnit = parseFloat(pricePerUnitStr) || 0;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

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

        // Per-line totals: a line keeps its own rate if set (Quick Sale), else the submitted invoice rate.
        let totalAmount = 0;
        const lines = ticketsRes.rows.map((t: any) => {
            const { rate, unit } = resolveLineRate(t.price_per_unit, t.price_unit, pricePerUnit, priceUnit);
            const amount = lineAmount(parseFloat(t.amount), parseFloat(t.net_lbs) || 0, rate, unit);
            totalAmount += amount;
            return { transactionId: t.transaction_id as number | null, amount };
        });

        // Create invoice with share token
        const shareToken = crypto.randomBytes(32).toString('hex');
        const invoiceRes = await client.query(`
            INSERT INTO invoices (invoice_number, customer, status, total_amount, price_per_unit, price_unit, notes, share_token, created_by, org_id)
            VALUES ($1, $2, 'draft', $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
        `, [invoiceNumber, customer || null, totalAmount, pricePerUnit || null, priceUnit, notes || null, shareToken, userId, orgId]);

        const invoiceId = invoiceRes.rows[0].id;

        // Link tickets to invoice
        await client.query(`
            UPDATE tickets SET invoice_id = $1, status = 'invoiced', updated_at = CURRENT_TIMESTAMP
            WHERE id = ANY($2) AND org_id = $3
        `, [invoiceId, ticketIds, orgId]);

        // Push each line's dollars onto its sale transaction (revenue lives on the sale)
        for (const line of lines) {
            if (line.transactionId) {
                await client.query(
                    'UPDATE transactions SET line_total = $1 WHERE id = $2 AND org_id = $3',
                    [line.amount, line.transactionId, orgId]
                );
            }
        }

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
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
    await requireActiveSubscription();

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

export async function deleteInvoice(id: string) {
    const { userId, orgId, has } = await auth();
    if (!userId || !orgId) throw new Error("Unauthorized");
    await requireActiveSubscription();

    if (!has({ permission: Permissions.INVOICES_MANAGE } as any)) {
        throw new Error("You do not have permission to manage invoices");
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Capture the sale transactions tied to this invoice's tickets before clearing the links
        const txRes = await client.query(
            'SELECT transaction_id FROM tickets WHERE invoice_id = $1 AND org_id = $2 AND transaction_id IS NOT NULL',
            [id, orgId]
        );
        const txIds = txRes.rows.map((r: any) => r.transaction_id);

        // Revert tickets to pending and clear their invoice + transaction links
        await client.query(`
            UPDATE tickets SET status = 'pending', invoice_id = NULL, transaction_id = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE invoice_id = $1 AND org_id = $2
        `, [id, orgId]);

        // Reverse the sale transactions so inventory returns (deleting the invoice = the sale didn't happen)
        if (txIds.length > 0) {
            await client.query(
                'DELETE FROM transactions WHERE id = ANY($1) AND org_id = $2',
                [txIds, orgId]
            );
        }

        // Delete the invoice
        await client.query('DELETE FROM invoices WHERE id = $1 AND org_id = $2', [id, orgId]);

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }

    revalidatePath('/tickets');
    revalidatePath('/dispatch');
    revalidatePath('/dispatch/invoices');
    revalidatePath('/');
    revalidatePath('/inventory');
    revalidatePath('/locations');
    revalidatePath('/transactions');
    redirect('/dispatch/invoices');
}

export async function updateInvoice(id: string, formData: FormData) {
    const { userId, orgId, has } = await auth();
    if (!userId || !orgId) throw new Error("Unauthorized");
    await requireActiveSubscription();

    if (!has({ permission: Permissions.INVOICES_MANAGE } as any)) {
        throw new Error("You do not have permission to manage invoices");
    }

    const customer = formData.get('customer') as string;
    const notes = formData.get('notes') as string;
    const pricePerUnitStr = formData.get('pricePerUnit') as string;
    const priceUnit = (formData.get('priceUnit') as string) || 'ton';
    const pricePerUnit = parseFloat(pricePerUnitStr) || 0;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Recompute total from each line's effective rate: a line keeps its own
        // per-item price (Quick Sale); lines without one use the submitted invoice rate.
        const ticketsRes = await client.query(
            'SELECT id, transaction_id, amount, net_lbs, price_per_unit, price_unit FROM tickets WHERE invoice_id = $1 AND org_id = $2',
            [id, orgId]
        );

        let totalAmount = 0;
        const lines = ticketsRes.rows.map((t: any) => {
            const { rate, unit } = resolveLineRate(t.price_per_unit, t.price_unit, pricePerUnit, priceUnit);
            const amount = lineAmount(parseFloat(t.amount), parseFloat(t.net_lbs) || 0, rate, unit);
            totalAmount += amount;
            return { transactionId: t.transaction_id as number | null, amount };
        });

        await client.query(`
            UPDATE invoices
            SET customer = $1, notes = $2, price_per_unit = $3, price_unit = $4, total_amount = $5, updated_at = CURRENT_TIMESTAMP
            WHERE id = $6 AND org_id = $7
        `, [customer || null, notes || null, pricePerUnit || null, priceUnit, totalAmount, id, orgId]);

        // Keep each line's dollars in sync on its sale transaction (revenue lives on the sale)
        for (const line of lines) {
            if (line.transactionId) {
                await client.query(
                    'UPDATE transactions SET line_total = $1 WHERE id = $2 AND org_id = $3',
                    [line.amount, line.transactionId, orgId]
                );
            }
        }

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }

    revalidatePath('/dispatch');
    revalidatePath('/dispatch/invoices');
    revalidatePath(`/dispatch/invoices/${id}`);
    revalidatePath('/');
    revalidatePath('/transactions');
    redirect(`/dispatch/invoices/${id}`);
}

export async function quickSale(formData: FormData) {
    const { userId, orgId, has } = await auth();
    if (!userId || !orgId) throw new Error("Unauthorized");
    await requireActiveSubscription();

    if (!has({ permission: Permissions.INVOICES_MANAGE } as any)) {
        throw new Error("You do not have permission to create invoices");
    }

    const customer = (formData.get('customer') as string)?.trim();
    const notes = (formData.get('notes') as string) || null;
    const itemsRaw = formData.get('items') as string;

    if (!customer) throw new Error("Customer is required");
    if (!itemsRaw) throw new Error("Add at least one item");

    interface RawItem {
        stackId?: string;
        locationId?: string;
        amount?: string;
        netLbs?: string;
        pricePerUnit?: string;
        priceUnit?: string;
    }
    let parsed: RawItem[];
    try {
        parsed = JSON.parse(itemsRaw);
    } catch {
        throw new Error("Could not read the sale items");
    }
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Add at least one item");

    // Normalize + validate each line
    const items = parsed.map((it, idx) => {
        const n = idx + 1;
        const stackId = (it.stackId || '').trim();
        const locationId = (it.locationId || '').trim();
        const amountNum = parseFloat(it.amount || '');
        const netLbsNum = it.netLbs ? parseFloat(it.netLbs) : null;
        const pricePerUnit = parseFloat(it.pricePerUnit || '') || 0;
        const priceUnit: 'bale' | 'ton' = it.priceUnit === 'bale' ? 'bale' : 'ton';
        if (!stackId) throw new Error(`Item ${n}: choose a lot`);
        if (!locationId || locationId === 'none') throw new Error(`Item ${n}: choose a location`);
        if (isNaN(amountNum) || amountNum <= 0) throw new Error(`Item ${n}: bales must be greater than zero`);
        if (netLbsNum !== null && (isNaN(netLbsNum) || netLbsNum < 0)) throw new Error(`Item ${n}: net lbs is invalid`);
        return { stackId, locationId, amount: amountNum, netLbs: netLbsNum, pricePerUnit, priceUnit };
    });

    const client = await pool.connect();
    let invoiceId: number;

    try {
        await client.query('BEGIN');

        // Verify stock per (stack, location), aggregating duplicate lines so we never oversell
        const demand = new Map<string, number>();
        for (const it of items) demand.set(`${it.stackId}|${it.locationId}`, (demand.get(`${it.stackId}|${it.locationId}`) || 0) + it.amount);
        for (const [key, needed] of demand) {
            const [stackId, locationId] = key.split('|');
            const invRes = await client.query(`
                SELECT
                    SUM(CASE
                        WHEN type IN ('production', 'purchase') THEN amount
                        WHEN type IN ('sale') THEN -amount
                        ELSE 0
                    END) as quantity
                FROM transactions
                WHERE stack_id = $1 AND location_id = $2 AND org_id = $3
            `, [stackId, locationId, orgId]);
            const stock = parseFloat(invRes.rows[0]?.quantity || '0');
            if (stock < needed) {
                throw new Error(`Insufficient stock for one of the lots (need ${needed}, have ${stock} bales)`);
            }
        }

        // Compute line amounts + grand total; detect a single shared rate across all lines
        let totalAmount = 0;
        for (const it of items) totalAmount += lineAmount(it.amount, it.netLbs || 0, it.pricePerUnit, it.priceUnit);
        const allPriced = items.every((i) => i.pricePerUnit > 0);
        const distinctRates = new Set(items.map((i) => `${i.pricePerUnit}|${i.priceUnit}`));
        const uniform = allPriced && distinctRates.size === 1;
        const invoiceRate = uniform ? items[0].pricePerUnit : null;
        const invoiceUnit = uniform ? items[0].priceUnit : (items[0].priceUnit || 'ton');

        // Create the invoice (one per sale)
        const countRes = await client.query('SELECT COUNT(*) FROM invoices WHERE org_id = $1', [orgId]);
        const invoiceNumber = `INV-${String(parseInt(countRes.rows[0].count) + 1).padStart(4, '0')}`;
        const shareToken = crypto.randomBytes(32).toString('hex');

        const invoiceRes = await client.query(`
            INSERT INTO invoices (invoice_number, customer, status, total_amount, price_per_unit, price_unit, notes, share_token, created_by, org_id)
            VALUES ($1, $2, 'draft', $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
        `, [invoiceNumber, customer, totalAmount, invoiceRate, invoiceUnit, notes, shareToken, userId, orgId]);
        invoiceId = invoiceRes.rows[0].id;

        // One auto-approved ticket + sale transaction per line item, linked to the invoice
        for (const it of items) {
            const ticketRes = await client.query(`
                INSERT INTO tickets (type, stack_id, location_id, amount, customer, notes, net_lbs, price_per_unit, price_unit, status, invoice_id, driver_id, org_id)
                VALUES ('sale', $1, $2, $3, $4, $5, $6, $7, $8, 'invoiced', $9, $10, $11)
                RETURNING id
            `, [it.stackId, it.locationId, it.amount, customer, notes, it.netLbs, it.pricePerUnit || null, it.priceUnit, invoiceId, userId, orgId]);
            const ticketId = ticketRes.rows[0].id;

            const lineTotal = lineAmount(it.amount, it.netLbs || 0, it.pricePerUnit, it.priceUnit);
            const txRes = await client.query(`
                INSERT INTO transactions (type, stack_id, location_id, amount, unit, entity, price, line_total, user_id, org_id)
                VALUES ('sale', $1, $2, $3, 'bales', $4, 0, $5, $6, $7)
                RETURNING id
            `, [it.stackId, it.locationId, it.amount, customer, lineTotal, userId, orgId]);

            await client.query('UPDATE tickets SET transaction_id = $1 WHERE id = $2', [txRes.rows[0].id, ticketId]);
        }

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }

    revalidatePath('/tickets');
    revalidatePath('/dispatch');
    revalidatePath('/dispatch/invoices');
    revalidatePath('/');
    revalidatePath('/inventory');
    revalidatePath('/locations');
    redirect(`/dispatch/invoices/${invoiceId}`);
}

export interface BusinessProfile {
    name: string | null;
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    phone: string | null;
    email: string | null;
    payment_instructions: string | null;
}

export async function getBusinessProfile(): Promise<BusinessProfile | null> {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) throw new Error("Unauthorized");
    return getBusinessProfileByOrg(orgId);
}

export async function getBusinessProfileByOrg(orgId: string): Promise<BusinessProfile | null> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT name, address_line1, address_line2, city, state, zip, phone, email, payment_instructions
             FROM business_profiles WHERE org_id = $1`,
            [orgId]
        );
        return result.rows[0] || null;
    } finally {
        client.release();
    }
}

export async function saveBusinessProfile(formData: FormData) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) throw new Error("Unauthorized");
    await requireActiveSubscription();
    await requirePermission(Permissions.INVOICES_MANAGE);

    const name = (formData.get('name') as string | null)?.trim() || null;
    const address_line1 = (formData.get('address_line1') as string | null)?.trim() || null;
    const address_line2 = (formData.get('address_line2') as string | null)?.trim() || null;
    const city = (formData.get('city') as string | null)?.trim() || null;
    const state = (formData.get('state') as string | null)?.trim() || null;
    const zip = (formData.get('zip') as string | null)?.trim() || null;
    const phone = (formData.get('phone') as string | null)?.trim() || null;
    const email = (formData.get('email') as string | null)?.trim() || null;
    const payment_instructions = (formData.get('payment_instructions') as string | null)?.trim() || null;

    const client = await pool.connect();
    try {
        await client.query(
            `INSERT INTO business_profiles
                (org_id, name, address_line1, address_line2, city, state, zip, phone, email, payment_instructions, updated_at, updated_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CURRENT_TIMESTAMP,$11)
             ON CONFLICT (org_id) DO UPDATE SET
                name = EXCLUDED.name,
                address_line1 = EXCLUDED.address_line1,
                address_line2 = EXCLUDED.address_line2,
                city = EXCLUDED.city,
                state = EXCLUDED.state,
                zip = EXCLUDED.zip,
                phone = EXCLUDED.phone,
                email = EXCLUDED.email,
                payment_instructions = EXCLUDED.payment_instructions,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = EXCLUDED.updated_by`,
            [orgId, name, address_line1, address_line2, city, state, zip, phone, email, payment_instructions, userId]
        );
    } finally {
        client.release();
    }

    revalidatePath('/settings/business');
    revalidatePath('/dispatch/invoices');
}
