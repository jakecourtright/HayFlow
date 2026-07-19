import Link from "next/link";
import type { ReactNode } from "react";

// Shared shell + typography for the public legal pages (/terms, /privacy).
// Content source of record: docs/legal/*.md — keep them in sync when editing.

export function LegalShell({ title, effectiveDate, children }: {
    title: string;
    effectiveDate: string;
    children: ReactNode;
}) {
    return (
        <article className="max-w-3xl mx-auto py-10 space-y-6">
            <header className="space-y-2">
                <p className="text-xs uppercase tracking-wider font-bold" style={{ color: 'var(--text-dim)' }}>
                    HayFlow · Dune Summit LLC
                </p>
                <h1 className="font-display text-4xl font-bold" style={{ color: 'var(--accent)' }}>{title}</h1>
                <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                    Effective {effectiveDate} · Contact: <a href="mailto:support@hayflow.io" className="underline">support@hayflow.io</a>
                </p>
                <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                    <Link href="/terms" className="underline">Terms of Service</Link>
                    {' · '}
                    <Link href="/privacy" className="underline">Privacy Policy</Link>
                    {' · '}
                    <Link href="/" className="underline">Home</Link>
                </p>
            </header>
            <div className="glass-card space-y-6">{children}</div>
        </article>
    );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
    return (
        <section className="space-y-2">
            <h2 className="font-bold text-lg" style={{ color: 'var(--accent)' }}>{heading}</h2>
            <div className="space-y-2 text-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>
                {children}
            </div>
        </section>
    );
}

export function LegalList({ items }: { items: ReactNode[] }) {
    return (
        <ul className="list-disc pl-5 space-y-1.5">
            {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
    );
}
