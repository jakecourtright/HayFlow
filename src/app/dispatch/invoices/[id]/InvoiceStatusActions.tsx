'use client';

import { updateInvoiceStatus } from "@/app/actions";
import { useState } from "react";
import { Send, CheckCircle, RotateCcw } from "lucide-react";

interface InvoiceStatusActionsProps {
    invoiceId: number;
    currentStatus: string;
}

export default function InvoiceStatusActions({ invoiceId, currentStatus }: InvoiceStatusActionsProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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

    return (
        <div className="space-y-2">
            {error && (
                <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                    {error}
                </div>
            )}

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
        </div>
    );
}
