"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    description?: string;
    body?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: "danger" | "primary";
    onConfirm: () => void;
    onCancel?: () => void;
    onClose?: () => void;
    busy?: boolean;
}

export default function ConfirmDialog({
    open,
    title,
    description,
    body,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    tone = "primary",
    onConfirm,
    onCancel,
    onClose,
    busy,
}: ConfirmDialogProps) {
    const panelRef = useRef<HTMLDivElement | null>(null);
    const dismiss = onCancel || onClose || (() => {});
    const message = description || body;

    useEffect(() => {
        if (!open) return;
        const prev = document.activeElement as HTMLElement | null;
        panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !busy) dismiss();
        };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
            prev?.focus();
        };
    }, [open, busy, dismiss]);

    if (!open) return null;

    return (
        <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            onClick={(e) => {
                if (e.target === e.currentTarget && !busy) dismiss();
            }}
        >
            <div ref={panelRef} className="modal-panel">
                <div className="flex items-start gap-3 mb-4">
                    {tone === "danger" && (
                        <div
                            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{
                                background: "color-mix(in srgb, var(--error) 12%, transparent)",
                                color: "var(--error)",
                            }}
                        >
                            <AlertTriangle size={20} />
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <h2 id="confirm-title" className="text-display-sm">
                            {title}
                        </h2>
                        {message && (
                            <p className="mt-1 text-sm" style={{ color: "var(--text-dim)" }}>
                                {message}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={dismiss}
                        disabled={busy}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        data-autofocus
                        className={`btn btn-sm ${tone === "danger" ? "btn-danger" : "btn-primary"}`}
                        onClick={onConfirm}
                        disabled={busy}
                        aria-busy={busy}
                    >
                        {busy ? "Working…" : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
