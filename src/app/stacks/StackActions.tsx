'use client';

import { archiveStack, unarchiveStack, deleteStack } from "@/app/actions";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Archive, ArchiveRestore } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

interface StackActionsProps {
    stackId: number;
    archived?: boolean;
    canDelete?: boolean;
}

export default function StackActions({ stackId, archived = false, canDelete = false }: StackActionsProps) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const toast = useToast();
    const router = useRouter();

    async function handleArchiveToggle() {
        setBusy(true);
        try {
            if (archived) {
                await unarchiveStack(stackId.toString());
                toast.success('Stack restored');
            } else {
                await archiveStack(stackId.toString());
                toast.success('Stack archived');
            }
            router.refresh();
        } catch (error: any) {
            if (error?.digest?.startsWith('NEXT_REDIRECT')) throw error;
            toast.error(error.message || 'Something went wrong');
        } finally {
            setBusy(false);
        }
    }

    async function handleDelete() {
        setBusy(true);
        try {
            await deleteStack(stackId.toString());
            toast.success('Stack deleted');
            router.refresh();
        } catch (error: any) {
            if (error?.digest?.startsWith('NEXT_REDIRECT')) throw error;
            toast.error(error.message || 'Failed to delete stack');
        } finally {
            setBusy(false);
            setOpen(false);
        }
    }

    return (
        <>
            <button
                onClick={handleArchiveToggle}
                disabled={busy}
                aria-label={archived ? 'Restore stack' : 'Archive stack'}
                title={archived ? 'Restore stack' : 'Archive stack'}
                className="icon-button"
            >
                {archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
            </button>
            {canDelete && (
                <button
                    onClick={() => setOpen(true)}
                    aria-label="Delete stack"
                    title="Delete stack"
                    className="icon-button icon-button-danger"
                >
                    <Trash2 size={14} />
                </button>
            )}
            <ConfirmDialog
                open={open}
                tone="danger"
                title="Delete this stack?"
                description="This permanently removes the stack. Its past transactions stay in the ledger but will no longer link to it. Prefer to keep it? Archive instead — you can restore it anytime."
                confirmLabel="Delete stack"
                busy={busy}
                onCancel={() => setOpen(false)}
                onConfirm={handleDelete}
            />
        </>
    );
}
