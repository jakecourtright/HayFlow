import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import EditTransactionForm from "./EditTransactionForm";
import PageHeader from "@/components/ui/PageHeader";

async function getTransaction(transactionId: string, orgId: string) {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT t.*, s.bale_size, s.weight_per_bale
            FROM transactions t
            LEFT JOIN stacks s ON s.id = t.stack_id
            WHERE t.id = $1 AND t.org_id = $2
        `, [transactionId, orgId]);

        return result.rows[0] || null;
    } finally {
        client.release();
    }
}

async function getStacks(orgId: string) {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT id, name, commodity FROM stacks WHERE org_id = $1 ORDER BY name ASC',
            [orgId]
        );
        return result.rows;
    } finally {
        client.release();
    }
}

async function getLocations(orgId: string) {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT id, name FROM locations WHERE org_id = $1 ORDER BY name ASC',
            [orgId]
        );
        return result.rows;
    } finally {
        client.release();
    }
}

export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    const { id } = await params;
    const [transaction, stacks, locations] = await Promise.all([
        getTransaction(id, orgId),
        getStacks(orgId),
        getLocations(orgId)
    ]);

    if (!transaction) notFound();

    // Transfer legs are a paired unit — editing one through the generic single-row
    // editor would orphan the other leg, so send them back to the read-only detail view.
    if (transaction.type === 'transfer_in' || transaction.type === 'transfer_out') {
        redirect(`/transactions/${id}`);
    }

    return (
        <div>
            <PageHeader
                eyebrow="Edit transaction"
                title={`Transaction #${transaction.id}`}
                backHref={`/transactions/${id}`}
                backLabel="Transaction"
            />
            <EditTransactionForm
                transaction={transaction}
                stacks={stacks}
                locations={locations}
            />
        </div>
    );
}
