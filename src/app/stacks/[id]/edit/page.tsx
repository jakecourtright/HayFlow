import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import EditStackForm from "./EditStackForm";
import PageHeader from "@/components/ui/PageHeader";

async function getStack(stackId: string, orgId: string) {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT * FROM stacks WHERE id = $1 AND org_id = $2',
            [stackId, orgId]
        );
        return result.rows[0] || null;
    } finally {
        client.release();
    }
}

export default async function EditStackPage({ params }: { params: Promise<{ id: string }> }) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    const { id } = await params;
    const stack = await getStack(id, orgId);

    if (!stack) notFound();

    return (
        <div>
            <PageHeader
                eyebrow="Edit stack"
                title={stack.name}
                subtitle={stack.commodity}
                backHref={`/stacks/${stack.id}`}
                backLabel="Stack"
            />
            <EditStackForm stack={stack} />
        </div>
    );
}
