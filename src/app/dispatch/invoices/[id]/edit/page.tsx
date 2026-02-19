import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { Permissions } from "@/lib/permissions";
import InvoiceEditForm from "./InvoiceEditForm";

async function getInvoice(invoiceId: string, orgId: string) {
    const client = await pool.connect();
    try {
        const invoiceRes = await client.query(
            'SELECT * FROM invoices WHERE id = $1 AND org_id = $2',
            [invoiceId, orgId]
        );
        if (invoiceRes.rows.length === 0) return null;

        const ticketsRes = await client.query(
            'SELECT amount, net_lbs FROM tickets WHERE invoice_id = $1 AND org_id = $2',
            [invoiceId, orgId]
        );

        return {
            invoice: invoiceRes.rows[0],
            totalBales: ticketsRes.rows.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0),
            totalNetLbs: ticketsRes.rows.reduce((sum: number, t: any) => sum + (parseFloat(t.net_lbs) || 0), 0),
        };
    } finally {
        client.release();
    }
}

export default async function InvoiceEditPage({ params }: { params: Promise<{ id: string }> }) {
    const { userId, orgId, has } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    if (!has({ permission: Permissions.INVOICES_MANAGE } as any)) {
        redirect("/tickets");
    }

    const { id } = await params;
    const data = await getInvoice(id, orgId);
    if (!data) notFound();

    return (
        <InvoiceEditForm
            invoice={data.invoice}
            totalBales={data.totalBales}
            totalNetLbs={data.totalNetLbs}
        />
    );
}
