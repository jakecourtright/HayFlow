'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { HelpCircle, ArrowRight } from 'lucide-react';

interface HelpTipProps {
    /** Short plain-language explanation shown in the popover. */
    children: React.ReactNode;
    /** Accessible label for the trigger button. */
    label?: string;
    /** Optional link to a fuller Help Center article. */
    learnMoreHref?: string;
    learnMoreLabel?: string;
    /** Anchor the popover's edge to the start (left) or end (right) of the icon. */
    align?: 'start' | 'end';
    /** Icon size in px. */
    size?: number;
    className?: string;
}

/**
 * Inline "?" hint. Drop it next to any label or field to explain jargon
 * (stack, $/ton, net lbs, pending → approved, share link, …). Opens on
 * hover (desktop) and tap/click (touch + keyboard). type="button" so it
 * never submits the form it lives inside.
 */
export default function HelpTip({
    children,
    label = 'More info',
    learnMoreHref,
    learnMoreLabel = 'Learn more',
    align = 'start',
    size = 15,
    className = '',
}: HelpTipProps) {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLSpanElement>(null);
    const id = useId();

    useEffect(() => {
        if (!open) return;
        function onPointerDown(e: PointerEvent) {
            if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
        }
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    return (
        <span
            ref={wrapperRef}
            className={`relative inline-flex align-middle ${className}`}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
        >
            <button
                type="button"
                aria-label={label}
                aria-expanded={open}
                aria-describedby={open ? id : undefined}
                onClick={() => setOpen((v) => !v)}
                onFocus={() => setOpen(true)}
                className="inline-flex items-center justify-center rounded-full transition-colors"
                style={{ color: open ? 'var(--primary)' : 'var(--text-dim)', lineHeight: 0 }}
            >
                <HelpCircle size={size} strokeWidth={1.75} />
            </button>

            {open && (
                <span
                    id={id}
                    role="tooltip"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-full mt-2 z-[70] block w-60 rounded-xl p-3 text-left font-normal normal-case tracking-normal"
                    style={{
                        [align === 'end' ? 'right' : 'left']: 0,
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--glass-border)',
                        boxShadow: '0 12px 32px rgba(28, 25, 23, 0.16)',
                        color: 'var(--text-main)',
                        fontSize: '0.8125rem',
                        lineHeight: 1.5,
                    }}
                >
                    <span className="block" style={{ color: 'var(--text-main)' }}>
                        {children}
                    </span>
                    {learnMoreHref && (
                        <Link
                            href={learnMoreHref}
                            className="mt-2 inline-flex items-center gap-1 font-bold"
                            style={{ color: 'var(--primary)', fontSize: '0.75rem' }}
                        >
                            {learnMoreLabel}
                            <ArrowRight size={12} />
                        </Link>
                    )}
                </span>
            )}
        </span>
    );
}
