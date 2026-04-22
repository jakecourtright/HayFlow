"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

interface SubmitButtonProps {
    children: React.ReactNode;
    pendingLabel?: string;
    variant?: "primary" | "danger" | "secondary" | "ghost";
    size?: "default" | "sm";
    className?: string;
    disabled?: boolean;
}

export default function SubmitButton({
    children,
    pendingLabel,
    variant = "primary",
    size = "default",
    className = "",
    disabled,
}: SubmitButtonProps) {
    const { pending } = useFormStatus();
    const classes = [
        "btn",
        `btn-${variant}`,
        size === "sm" ? "btn-sm" : "",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <button
            type="submit"
            className={classes}
            disabled={pending || disabled}
            aria-busy={pending}
        >
            {pending ? (
                <>
                    <Loader2 size={16} className="animate-spin" />
                    {pendingLabel ?? "Working…"}
                </>
            ) : (
                children
            )}
        </button>
    );
}
