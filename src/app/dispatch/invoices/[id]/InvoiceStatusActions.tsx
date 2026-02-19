'use client';

import { updateInvoiceStatus, deleteInvoice } from "@/app/actions";
import { useState } from "react";
import { Send, CheckCircle, RotateCcw, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

interface InvoiceStatusActionsProps {
    invoiceId: number;
    currentStatus: string;
}

export default function InvoiceStatusActions({ invoiceId, currentStatus }: InvoiceStatusActionsProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    async function handleStatusChange(newStatus: string) {
        setLoading(true);
        setError('');
        try {
            await updateInvoiceStatus(invoiceId.toString(), newStatus);
        } catch (e: any) {
            setError(e.message || 'Failed to update status');
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete() {
        setLoading(true);
        setError('');
        try {
            await deleteInvoice(invoiceId.toString());
        } catch (e: any) {
            if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e;
            setError(e.message || 'Failed to delete invoice');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-2">
            {error && (
                <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                    {error}
                </div>
            )}

            {/* Status Actions */}
            {currentStatus === 'draft' && (
                <button
                    onClick={() => handleStatusChange('sent')}
                    disabled={loading}
                    className="btn btn-primary w-full flex items-center justify-center gap-2"
                >
                    <Send size={16} />
                    Mark as Sent
                </button>
            )}

            {currentStatus === 'sent' && (
                <div className="flex gap-3">
                    <button
                        onClick={() => handleStatusChange('paid')}
                        disabled={loading}
                        className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                        <CheckCircle size={16} />
                        Mark as Paid
                    </button>
                    <button
                        onClick={() => handleStatusChange('draft')}
                        disabled={loading}
                        className="btn btn-secondary flex items-center justify-center gap-2"
                        style={{ background: 'var(--bg-surface)' }}
                    >
                        <RotateCcw size={16} />
                    </button>
                </div>
            )}

            {currentStatus === 'paid' && (
                <div className="glass-card text-center py-3">
                    <p className="text-sm font-bold" style={{ color: '#22c55e' }}>
                        ✓ Invoice Paid
                    </p>
                </div>
            )}

            {/* Edit & Delete — always visible */}
            <div className="flex gap-3 pt-2">
                <Link
                    href={`/dispatch/invoices/${invoiceId}/edit`}
                    className="btn btn-secondary flex-1 flex items-center justify-center gap-2"
                    style={{ background: 'var(--bg-surface)' }}
                >
                    <Pencil size={16} />
                    Edit
                </Link>
                {!showDeleteConfirm ? (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="btn btn-secondary flex items-center justify-center gap-2"
                        style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
                    >
                        <Trash2 size={16} />
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button
                            onClick={handleDelete}
                            disabled={loading}
                            className="btn text-sm px-3 py-2"
                            style={{ background: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
                        >
                            Confirm Delete
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="btn btn-secondary text-sm px-3 py-2"
                            style={{ background: 'var(--bg-surface)' }}
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
