'use client';

import { deleteStack } from "@/app/actions";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

export default function StackActions({ stackId }: { stackId: number }) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const toast = useToast();
    const router = useRouter();

    async function handleDelete() {
        setBusy(true);
        try {
            await deleteStack(stackId.toString());
            toast.success('Stack deleted');
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete stack');
        } finally {
            setBusy(false);
            setOpen(false);
        }
    }

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                aria-label="Delete stack"
                className="icon-button icon-button-danger"
            >
                <Trash2 size={14} />
            </button>
            <ConfirmDialog
                open={open}
                tone="danger"
                title="Delete this stack?"
                description="Transaction history stays in the database but will reference a deleted stack. Consider archiving if you need to audit later."
                confirmLabel="Delete stack"
                busy={busy}
                onCancel={() => setOpen(false)}
                onConfirm={handleDelete}
            />
        </>
    );
}
