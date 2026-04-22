'use client';

import { deleteLocation } from "@/app/actions";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

export default function DeleteButton({ locationId }: { locationId: string }) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const toast = useToast();
    const router = useRouter();

    async function handleDelete() {
        setBusy(true);
        try {
            await deleteLocation(locationId);
            toast.success('Location deleted');
            router.push('/locations');
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete location');
            setBusy(false);
            setOpen(false);
        }
    }

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="btn btn-danger w-full"
            >
                <Trash2 size={16} />
                Delete location
            </button>
            <ConfirmDialog
                open={open}
                tone="danger"
                title="Delete this location?"
                description="You can only delete empty locations — move any bales out first. This cannot be undone."
                confirmLabel="Delete location"
                busy={busy}
                onCancel={() => setOpen(false)}
                onConfirm={handleDelete}
            />
        </>
    );
}
