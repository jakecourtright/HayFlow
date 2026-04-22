"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";
interface Toast {
    id: number;
    message: string;
    variant: ToastVariant;
}

interface ToastContextValue {
    push: (message: string, variant?: ToastVariant) => void;
    show: (message: string, variant?: ToastVariant) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
    return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const idRef = useRef(0);

    const push = useCallback((message: string, variant: ToastVariant = "info") => {
        const id = ++idRef.current;
        setToasts((prev) => [...prev, { id, message, variant }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    const api: ToastContextValue = {
        push,
        show: push,
        success: (m) => push(m, "success"),
        error: (m) => push(m, "error"),
        info: (m) => push(m, "info"),
    };

    return (
        <ToastContext.Provider value={api}>
            {children}
            <ToastViewport toasts={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
        </ToastContext.Provider>
    );
}

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
    if (toasts.length === 0) return null;
    return (
        <div className="toast-viewport" aria-live="polite" aria-atomic="true">
            {toasts.map((t) => {
                const Icon = t.variant === "success" ? CheckCircle2 : t.variant === "error" ? AlertCircle : Info;
                return (
                    <div key={t.id} className={`toast toast-${t.variant}`} role="status">
                        <Icon size={18} className={`toast-icon-${t.variant}`} />
                        <span className="flex-1">{t.message}</span>
                        <button
                            aria-label="Dismiss"
                            onClick={() => onDismiss(t.id)}
                            className="opacity-60 hover:opacity-100"
                        >
                            <X size={14} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
