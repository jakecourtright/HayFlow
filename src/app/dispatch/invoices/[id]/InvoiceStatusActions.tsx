'use client';

import { updateInvoiceStatus, deleteInvoice } from "@/app/actions";
import { useState } from "react";
import { Send, CheckCircle, RotateCcw, Pencil, Trash2, Share2, Check, AlertCircle } from "lucide-react";
import Link from "next/link";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import HelpTip from "@/components/ui/HelpTip";

interface InvoiceStatusActionsProps {
    invoiceId: number;
    currentStatus: string;
    shareToken: string;
}

export default function InvoiceStatusActions({ invoiceId, currentStatus, shareToken }: InvoiceStatusActionsProps) {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [copied, setCopied] = useState(false);

    async function handleStatusChange(newStatus: string) {
        setLoading(true);
        setError('');
        try {
            await updateInvoiceStatus(invoiceId.toString(), newStatus);
            toast.show(
                newStatus === 'sent' ? 'Invoice marked as sent' :
                newStatus === 'paid' ? 'Invoice marked as paid' :
                'Invoice returned to draft',
                'success'
            );
        } catch (e: any) {
            const msg = e.message || 'Failed to update status';
            setError(msg);
            toast.show(msg, 'error');
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete() {
        setLoading(true);
        setError('');
        try {
            await deleteInvoice(invoiceId.toString());
            toast.show('Invoice deleted', 'success');
        } catch (e: any) {
            if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e;
            const msg = e.message || 'Failed to delete invoice';
            setError(msg);
            toast.show(msg, 'error');
        } finally {
            setLoading(false);
            setConfirmDelete(false);
        }
    }

    async function handleShare() {
        const url = `${window.location.origin}/invoice/${shareToken}`;
        try {
            if (navigator.share) {
                await navigator.share({ title: 'Invoice', url });
                return;
            }
            await navigator.clipboard.writeText(url);
            setCopied(true);
            toast.show('Invoice link copied', 'success');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                toast.show('Invoice link copied', 'success');
                setTimeout(() => setCopied(false), 2000);
            } catch {
                toast.show('Unable to share invoice', 'error');
            }
        }
    }

    return (
        <div className="space-y-2">
            {error && (
                <div role="alert" className="surface-card flex items-start gap-2 p-3" style={{ borderColor: 'var(--error)', color: 'var(--error)' }}>
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-dim)' }}>
                How sending works
                <HelpTip learnMoreHref="/help/sending-invoices">
                    HayFlow doesn&apos;t email invoices for you. Tap &ldquo;Share invoice&rdquo; to copy the customer link (text or email it yourself), then &ldquo;Mark as sent&rdquo; so it counts as outstanding until you mark it paid.
                </HelpTip>
            </p>

            <button
                type="button"
                onClick={handleShare}
                className="btn btn-secondary w-full"
                style={{ color: copied ? 'var(--success)' : 'var(--text-main)' }}
            >
                {copied ? <Check size={16} /> : <Share2 size={16} />}
                {copied ? 'Link copied' : 'Share invoice'}
            </button>

            {currentStatus === 'draft' && (
                <button
                    type="button"
                    onClick={() => handleStatusChange('sent')}
                    disabled={loading}
                    aria-busy={loading}
                    className="btn btn-primary w-full"
                >
                    <Send size={16} />
                    Mark as sent
                </button>
            )}

            {currentStatus === 'sent' && (
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => handleStatusChange('paid')}
                        disabled={loading}
                        aria-busy={loading}
                        className="btn btn-primary flex-1"
                    >
                        <CheckCircle size={16} />
                        Mark as paid
                    </button>
                    <button
                        type="button"
                        onClick={() => handleStatusChange('draft')}
                        disabled={loading}
                        className="btn btn-secondary"
                        aria-label="Return to draft"
                        title="Return to draft"
                    >
                        <RotateCcw size={16} />
                    </button>
                </div>
            )}

            {currentStatus === 'paid' && (
                <div className="surface-card flex items-center justify-center gap-2 py-3" style={{ color: 'var(--success)' }}>
                    <CheckCircle size={16} />
                    <p className="text-sm font-bold">Invoice paid</p>
                </div>
            )}

            <div className="flex gap-2 pt-2">
                <Link
                    href={`/dispatch/invoices/${invoiceId}/edit`}
                    className="btn btn-secondary flex-1"
                >
                    <Pencil size={16} />
                    Edit
                </Link>
                <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="icon-button icon-button-danger"
                    aria-label="Delete invoice"
                    title="Delete invoice"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            <ConfirmDialog
                open={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                onConfirm={handleDelete}
                title="Delete invoice?"
                body="Tickets on this invoice will return to the approved queue so you can re-bundle them."
                confirmLabel="Delete invoice"
                tone="danger"
                busy={loading}
            />
        </div>
    );
}
