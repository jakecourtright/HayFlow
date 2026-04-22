'use client';

import { approveTicket, rejectTicket, deleteTicket } from "@/app/actions";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Trash2, AlertCircle } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

interface TicketActionsProps {
    ticketId: number;
    status: string;
    canManage: boolean;
    isOwner: boolean;
}

type PendingAction = "reject" | "delete" | null;

export default function TicketActions({ ticketId, status, canManage, isOwner }: TicketActionsProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [pending, setPending] = useState<PendingAction>(null);
    const toast = useToast();
    const router = useRouter();

    async function run(action: () => Promise<void>, successMessage: string) {
        setLoading(true);
        setError('');
        try {
            await action();
            toast.success(successMessage);
            router.refresh();
        } catch (e: any) {
            const msg = e.message || 'Action failed';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
            setPending(null);
        }
    }

    if (status !== 'pending') return null;

    return (
        <div className="space-y-3">
            {error && (
                <div
                    role="alert"
                    className="flex items-start gap-2 p-3 rounded-xl text-sm"
                    style={{
                        background: 'color-mix(in srgb, var(--error) 12%, transparent)',
                        color: 'var(--error)',
                    }}
                >
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {canManage && (
                <div className="flex gap-2">
                    <button
                        onClick={() => run(() => approveTicket(ticketId.toString()), 'Ticket approved')}
                        disabled={loading}
                        aria-busy={loading}
                        className="btn btn-primary flex-1"
                    >
                        <Check size={16} />
                        Approve
                    </button>
                    <button
                        onClick={() => setPending('reject')}
                        disabled={loading}
                        className="btn btn-danger flex-1"
                    >
                        <X size={16} />
                        Reject
                    </button>
                </div>
            )}

            {(isOwner || canManage) && (
                <button
                    onClick={() => setPending('delete')}
                    disabled={loading}
                    className="btn btn-ghost btn-sm w-full"
                >
                    <Trash2 size={14} />
                    Delete ticket
                </button>
            )}

            <ConfirmDialog
                open={pending === 'reject'}
                tone="danger"
                title="Reject this ticket?"
                description="The driver will see it marked as rejected. Inventory will not move."
                confirmLabel="Reject ticket"
                busy={loading}
                onCancel={() => setPending(null)}
                onConfirm={() => run(() => rejectTicket(ticketId.toString()), 'Ticket rejected')}
            />

            <ConfirmDialog
                open={pending === 'delete'}
                tone="danger"
                title="Delete this ticket?"
                description="This cannot be undone. Use reject if you want to keep a record."
                confirmLabel="Delete permanently"
                busy={loading}
                onCancel={() => setPending(null)}
                onConfirm={() => run(() => deleteTicket(ticketId.toString()), 'Ticket deleted')}
            />
        </div>
    );
}
