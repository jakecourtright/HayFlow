'use client';

import { approveTicket, rejectTicket, deleteTicket } from "@/app/actions";
import { useState } from "react";
import { Check, X, Trash2 } from "lucide-react";

interface TicketActionsProps {
    ticketId: number;
    status: string;
    canManage: boolean;
    isOwner: boolean;
}

export default function TicketActions({ ticketId, status, canManage, isOwner }: TicketActionsProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleAction(action: () => Promise<void>) {
        setLoading(true);
        setError('');
        try {
            await action();
        } catch (e: any) {
            setError(e.message || 'Action failed');
        } finally {
            setLoading(false);
        }
    }

    if (status !== 'pending') {
        return null;
    }

    return (
        <div className="space-y-3">
            {error && (
                <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                    {error}
                </div>
            )}

            {/* Bookkeeper/Admin actions */}
            {canManage && (
                <div className="flex gap-3">
                    <button
                        onClick={() => handleAction(() => approveTicket(ticketId.toString()))}
                        disabled={loading}
                        className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                        <Check size={16} />
                        Approve
                    </button>
                    <button
                        onClick={() => {
                            if (confirm('Reject this ticket?')) {
                                handleAction(() => rejectTicket(ticketId.toString()));
                            }
                        }}
                        disabled={loading}
                        className="btn btn-secondary flex-1 flex items-center justify-center gap-2"
                        style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                    >
                        <X size={16} />
                        Reject
                    </button>
                </div>
            )}

            {/* Owner or manager can delete pending tickets */}
            {(isOwner || canManage) && (
                <button
                    onClick={() => {
                        if (confirm('Delete this ticket? This cannot be undone.')) {
                            handleAction(() => deleteTicket(ticketId.toString()));
                        }
                    }}
                    disabled={loading}
                    className="btn w-full flex items-center justify-center gap-2 text-sm"
                    style={{ background: 'var(--bg-surface)', color: 'var(--text-dim)' }}
                >
                    <Trash2 size={14} />
                    Delete Ticket
                </button>
            )}
        </div>
    );
}
