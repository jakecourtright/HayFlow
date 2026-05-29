'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { usePathname } from 'next/navigation';
import { X, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { markTourComplete } from '@/app/actions';
import { getAutoStartTour, getTourById, getTourForRole, type Tour, type TourStep } from '@/lib/tours';

interface TourGuideProps {
    completedTours: string[];
    isDriver: boolean;
    isOffice: boolean;
}

const CARD_WIDTH = 320; // px
const GAP = 14; // px between target and card
const PAD = 8; // spotlight padding around target

export default function TourGuide({ completedTours, isDriver, isOffice }: TourGuideProps) {
    const pathname = usePathname();

    const [done, setDone] = useState<Set<string>>(() => new Set(completedTours));
    const [activeId, setActiveId] = useState<string | null>(null);
    const [steps, setSteps] = useState<TourStep[]>([]);
    const [idx, setIdx] = useState(0);
    const [rect, setRect] = useState<DOMRect | null>(null);
    const [reduced, setReduced] = useState(false);

    const targetElRef = useRef<HTMLElement | null>(null);
    const autoStartedRef = useRef<Set<string>>(new Set());

    // Honor prefers-reduced-motion (disables smooth scroll + transitions).
    useEffect(() => {
        const m = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReduced(m.matches);
        const onChange = () => setReduced(m.matches);
        m.addEventListener('change', onChange);
        return () => m.removeEventListener('change', onChange);
    }, []);

    // Resolve a tour against the current DOM and begin it. Steps whose target
    // isn't present on this page are dropped so the tour never points at nothing.
    const start = useCallback((tour: Tour) => {
        const resolved = tour.steps.filter(
            (s) => !s.target || document.querySelector(`[data-tour="${s.target}"]`)
        );
        if (resolved.length === 0) return;
        setSteps(resolved);
        setIdx(0);
        setActiveId(tour.id);
    }, []);

    const close = useCallback((tourId: string | null) => {
        if (tourId) {
            setDone((prev) => {
                const next = new Set(prev);
                next.add(tourId);
                return next;
            });
            // Persist; best-effort — a failed write just means it may show again.
            markTourComplete(tourId).catch(() => {});
        }
        setActiveId(null);
        setSteps([]);
        setIdx(0);
        setRect(null);
        targetElRef.current = null;
    }, []);

    // Auto-start the role tour on its page, once, if not already completed.
    useEffect(() => {
        if (activeId) return;
        const tour = getAutoStartTour(pathname, { isDriver, isOffice });
        if (!tour || done.has(tour.id) || autoStartedRef.current.has(tour.id)) return;
        autoStartedRef.current.add(tour.id);
        // Let the page's anchors mount before measuring.
        const t = setTimeout(() => start(tour), 700);
        return () => clearTimeout(t);
    }, [pathname, activeId, done, isDriver, isOffice, start]);

    // Allow any part of the app to launch a tour (Help drawer, checklist button).
    useEffect(() => {
        const handler = (e: Event) => {
            const id = (e as CustomEvent).detail?.tourId as string | undefined;
            const tour = id ? getTourById(id) : getTourForRole({ isDriver, isOffice });
            if (tour) start(tour);
        };
        window.addEventListener('hayflow:start-tour', handler);
        return () => window.removeEventListener('hayflow:start-tour', handler);
    }, [isDriver, isOffice, start]);

    // Measure the current step's target (scroll it into view first).
    useEffect(() => {
        if (!activeId) return;
        const step = steps[idx];
        if (!step) return;
        if (!step.target) {
            targetElRef.current = null;
            setRect(null);
            return;
        }
        const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
        targetElRef.current = el;
        if (!el) {
            setRect(null);
            return;
        }
        el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center', inline: 'center' });
        const measure = () => setRect(el.getBoundingClientRect());
        measure();
        const t = setTimeout(measure, reduced ? 0 : 320);
        return () => clearTimeout(t);
    }, [activeId, idx, steps, reduced]);

    // Keep the spotlight glued to the target as the page scrolls or resizes.
    useEffect(() => {
        if (!activeId) return;
        const reposition = () => {
            const el = targetElRef.current;
            if (el) setRect(el.getBoundingClientRect());
        };
        window.addEventListener('resize', reposition);
        window.addEventListener('scroll', reposition, true);
        return () => {
            window.removeEventListener('resize', reposition);
            window.removeEventListener('scroll', reposition, true);
        };
    }, [activeId]);

    // Escape ends the tour.
    useEffect(() => {
        if (!activeId) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close(activeId);
            if (e.key === 'ArrowRight') setIdx((i) => Math.min(i + 1, steps.length - 1));
            if (e.key === 'ArrowLeft') setIdx((i) => Math.max(i - 1, 0));
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [activeId, steps.length, close]);

    if (!activeId || steps.length === 0) return null;

    const step = steps[idx];
    const isLast = idx === steps.length - 1;
    const isFirst = idx === 0;
    const transition = reduced ? 'none' : 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)';

    // Card placement: centered when there's no target, otherwise above/below it.
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
    const width = Math.min(CARD_WIDTH, vw - 32);

    let cardStyle: CSSProperties;
    if (!rect) {
        cardStyle = {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width,
        };
    } else {
        const spaceBelow = vh - rect.bottom;
        const spaceAbove = rect.top;
        const left = Math.max(16, Math.min(rect.left + rect.width / 2 - width / 2, vw - width - 16));
        if (spaceBelow >= 220 || spaceBelow >= spaceAbove) {
            cardStyle = { top: Math.min(rect.bottom + GAP, vh - 16), left, width };
        } else {
            cardStyle = { bottom: Math.max(vh - rect.top + GAP, 16), left, width };
        }
    }

    return (
        <div className="print-hide" aria-live="polite">
            {/* Backdrop — dark only when there's no spotlight to provide it. */}
            <div
                className="fixed inset-0 z-[94]"
                style={{ background: rect ? 'transparent' : 'rgba(0,0,0,0.55)' }}
                aria-hidden="true"
            />

            {/* Spotlight ring (the box-shadow dims everything outside the hole). */}
            {rect && (
                <div
                    className="fixed z-[94] pointer-events-none"
                    style={{
                        top: rect.top - PAD,
                        left: rect.left - PAD,
                        width: rect.width + PAD * 2,
                        height: rect.height + PAD * 2,
                        borderRadius: 14,
                        boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                        border: '2px solid var(--primary)',
                        transition,
                    }}
                />
            )}

            {/* Coachmark card */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label={step.title}
                className="fixed z-[95]"
                style={{ ...cardStyle, transition: rect ? transition : 'none' }}
            >
                <div
                    style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '1rem',
                        boxShadow: '0 24px 60px rgba(10, 10, 10, 0.3)',
                        padding: '1rem 1.1rem 1.1rem',
                        animation: reduced ? 'none' : 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-eyebrow">Step {idx + 1} of {steps.length}</span>
                        <button
                            type="button"
                            aria-label="End tour"
                            onClick={() => close(activeId)}
                            className="icon-button"
                            style={{ width: 28, height: 28 }}
                        >
                            <X size={15} />
                        </button>
                    </div>

                    <h3 className="font-bold text-base mb-1" style={{ color: 'var(--text-main)' }}>
                        {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed mb-3.5" style={{ color: 'var(--text-dim)' }}>
                        {step.body}
                    </p>

                    {/* Progress dots */}
                    <div className="flex items-center gap-1.5 mb-3">
                        {steps.map((_, i) => (
                            <span
                                key={i}
                                className="rounded-full"
                                style={{
                                    width: i === idx ? 18 : 6,
                                    height: 6,
                                    background: i === idx ? 'var(--primary)' : 'var(--glass-border)',
                                    transition: reduced ? 'none' : 'width 0.2s ease',
                                }}
                            />
                        ))}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => close(activeId)}
                            className="btn btn-ghost btn-sm"
                        >
                            Skip
                        </button>
                        <div className="flex items-center gap-2">
                            {!isFirst && (
                                <button
                                    type="button"
                                    onClick={() => setIdx((i) => Math.max(i - 1, 0))}
                                    className="btn btn-secondary btn-sm"
                                >
                                    <ArrowLeft size={15} />
                                    Back
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => (isLast ? close(activeId) : setIdx((i) => i + 1))}
                                className="btn btn-primary btn-sm"
                            >
                                {isLast ? (
                                    <>
                                        Done
                                        <Check size={15} />
                                    </>
                                ) : (
                                    <>
                                        Next
                                        <ArrowRight size={15} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
