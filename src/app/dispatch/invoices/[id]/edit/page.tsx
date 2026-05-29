import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { Permissions } from "@/lib/permissions";
import InvoiceEditForm from "./InvoiceEditForm";
import PageHeader from "@/components/ui/PageHeader";
import { resolveLineRate, lineAmount } from "@/lib/units";

async function getInvoice(invoiceId: string, orgId: string) {
    const client = await pool.connect();
    try {
        const invoiceRes = await client.query(
            'SELECT * FROM invoices WHERE id = $1 AND org_id = $2',
            [invoiceId, orgId]
        );
        if (invoiceRes.rows.length === 0) return null;

        const ticketsRes = await client.query(
            'SELECT amount, net_lbs, price_per_unit, price_unit FROM tickets WHERE invoice_id = $1 AND org_id = $2',
            [invoiceId, orgId]
        );

        const invoice = invoiceRes.rows[0];
        const lineTotal = ticketsRes.rows.reduce((sum: number, t: any) => {
            const { rate, unit } = resolveLineRate(t.price_per_unit, t.price_unit, invoice.price_per_unit, invoice.price_unit);
            return sum + lineAmount(parseFloat(t.amount), parseFloat(t.net_lbs) || 0, rate, unit);
        }, 0);

        return {
            invoice,
            totalBales: ticketsRes.rows.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0),
            totalNetLbs: ticketsRes.rows.reduce((sum: number, t: any) => sum + (parseFloat(t.net_lbs) || 0), 0),
            lineTotal,
            hasPerLinePricing: ticketsRes.rows.some((t: any) => parseFloat(t.price_per_unit) > 0),
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
        <div>
            <PageHeader
                eyebrow="Edit invoice"
                title={data.invoice.invoice_number}
                subtitle={data.invoice.customer || 'No customer'}
                backHref={`/dispatch/invoices/${data.invoice.id}`}
                backLabel="Invoice"
            />
            <InvoiceEditForm
                invoice={data.invoice}
                totalBales={data.totalBales}
                totalNetLbs={data.totalNetLbs}
                lineTotal={data.lineTotal}
                hasPerLinePricing={data.hasPerLinePricing}
            />
        </div>
    );
}
