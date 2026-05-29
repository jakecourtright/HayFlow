'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
    MessageCircleQuestion, X, Search, Send, ArrowRight, ArrowLeft,
    Sparkles, LifeBuoy, Loader2, CheckCircle2, BookOpen, Compass,
} from 'lucide-react';
import { askHelp, escalateSupport } from '@/app/actions';
import { searchArticles, type HelpArticle } from '@/lib/help-content';
import { useToast } from '@/components/ui/Toast';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type View = 'browse' | 'chat';

const GREETING =
    "Hi! I'm the HayFlow assistant. Ask me how to do something — like sending an invoice or filing a ticket — and I'll walk you through it. If I can't help, I'll get a message to the team.";

const QUICK_QUESTIONS = [
    'How do I send an invoice?',
    'What is a stack?',
    'How do drivers file a ticket?',
];

export default function HelpLauncher({ articles }: { articles: HelpArticle[] }) {
    const toast = useToast();
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<View>('browse');

    // Browse
    const [query, setQuery] = useState('');
    const browseResults = query.trim() ? searchArticles(query, articles).slice(0, 6) : [];

    // Chat
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Escalation
    const [escOpen, setEscOpen] = useState(false);
    const [escMsg, setEscMsg] = useState('');
    const [escEmail, setEscEmail] = useState('');
    const [escSending, setEscSending] = useState(false);
    const [escDone, setEscDone] = useState(false);

    const openChat = useCallback(() => {
        setOpen(true);
        setView('chat');
    }, []);

    const startTour = useCallback(() => {
        setOpen(false);
        // Defer so the drawer is gone before the tour measures the page.
        setTimeout(() => window.dispatchEvent(new CustomEvent('hayflow:start-tour')), 150);
    }, []);

    // Let other parts of the app (e.g. the Help Center) open the assistant.
    useEffect(() => {
        const handler = () => openChat();
        window.addEventListener('hayflow:open-help', handler);
        return () => window.removeEventListener('hayflow:open-help', handler);
    }, [openChat]);

    // Close on Escape.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open]);

    // Keep chat scrolled to the latest message.
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, sending, view]);

    async function send(text: string) {
        const content = text.trim();
        if (!content || sending) return;
        const next = [...messages, { role: 'user' as const, content }];
        setMessages(next);
        setInput('');
        setSending(true);
        try {
            const res = await askHelp(next);
            setMessages([...next, { role: 'assistant', content: res.reply }]);
        } catch {
            setMessages([
                ...next,
                {
                    role: 'assistant',
                    content: "I hit a snag answering that. You can try again, or tap “Reach the team” below and I'll pass your question along.",
                },
            ]);
        } finally {
            setSending(false);
        }
    }

    async function submitEscalation() {
        if (!escMsg.trim() || escSending) return;
        setEscSending(true);
        try {
            await escalateSupport({
                message: escMsg.trim(),
                email: escEmail.trim() || undefined,
                transcript: messages,
                page: typeof window !== 'undefined' ? window.location.pathname : undefined,
            });
            setEscDone(true);
            setEscMsg('');
            toast.success('Sent — the team will get back to you.');
        } catch {
            toast.error("Couldn't send just now. Please try again.");
        } finally {
            setEscSending(false);
        }
    }

    return (
        <>
            {/* Floating launcher button */}
            <button
                type="button"
                aria-label="Help and support"
                data-tour="help"
                onClick={() => setOpen(true)}
                className="fixed right-4 z-[60] flex h-12 w-12 items-center justify-center rounded-full transition-transform hover:-translate-y-0.5 print-hide"
                style={{
                    bottom: 'calc(5rem + env(safe-area-inset-bottom))',
                    background: 'var(--primary)',
                    color: '#fff',
                    boxShadow: '0 6px 20px var(--primary-glow)',
                }}
            >
                <MessageCircleQuestion size={22} />
            </button>

            {open && (
                <div className="modal-overlay" onClick={() => setOpen(false)} aria-modal="true" role="dialog">
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex w-full flex-col overflow-hidden"
                        style={{
                            maxWidth: '28rem',
                            maxHeight: 'min(82vh, 42rem)',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '1.25rem',
                            boxShadow: '0 24px 60px rgba(10, 10, 10, 0.25)',
                            animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                    >
                        {/* Header */}
                        <div
                            className="flex items-center gap-2 px-4 py-3"
                            style={{ borderBottom: '1px solid var(--glass-border)' }}
                        >
                            {view === 'chat' ? (
                                <button
                                    type="button"
                                    aria-label="Back to help"
                                    onClick={() => { setView('browse'); setEscOpen(false); }}
                                    className="icon-button"
                                >
                                    <ArrowLeft size={18} />
                                </button>
                            ) : (
                                <span
                                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                                    style={{ background: 'color-mix(in srgb, var(--primary) 14%, transparent)', color: 'var(--primary)' }}
                                >
                                    <LifeBuoy size={18} />
                                </span>
                            )}
                            <span className="font-bold flex-1" style={{ color: 'var(--text-main)' }}>
                                {view === 'chat' ? 'Ask HayFlow' : 'Help & support'}
                            </span>
                            <button type="button" aria-label="Close help" onClick={() => setOpen(false)} className="icon-button">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        {view === 'browse' ? (
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                <div className="relative">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                                    <input
                                        type="search"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Search help…"
                                        className="input-modern"
                                        style={{ paddingLeft: '2.4rem' }}
                                        aria-label="Search help"
                                    />
                                </div>

                                {query.trim() ? (
                                    browseResults.length > 0 ? (
                                        <div className="space-y-1.5">
                                            {browseResults.map((a) => (
                                                <Link
                                                    key={a.slug}
                                                    href={`/help/${a.slug}`}
                                                    onClick={() => setOpen(false)}
                                                    className="flex items-center justify-between gap-2 rounded-lg p-2.5 transition-colors"
                                                    style={{ border: '1px solid var(--glass-border)' }}
                                                >
                                                    <span className="min-w-0">
                                                        <span className="block text-sm font-semibold truncate" style={{ color: 'var(--text-main)' }}>{a.title}</span>
                                                        <span className="block text-xs truncate" style={{ color: 'var(--text-dim)' }}>{a.summary}</span>
                                                    </span>
                                                    <ArrowRight size={14} className="flex-shrink-0" style={{ color: 'var(--primary)' }} />
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm py-2" style={{ color: 'var(--text-dim)' }}>
                                            No matches. Try “Ask HayFlow” below.
                                        </p>
                                    )
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setView('chat')}
                                            className="w-full flex items-center gap-3 rounded-xl p-3 text-left transition-all hover:brightness-105"
                                            style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)', border: '1px solid var(--glass-border)' }}
                                        >
                                            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'color-mix(in srgb, var(--primary) 16%, transparent)', color: 'var(--primary)' }}>
                                                <Sparkles size={18} />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block font-bold" style={{ color: 'var(--text-main)' }}>Ask HayFlow</span>
                                                <span className="block text-xs" style={{ color: 'var(--text-dim)' }}>Quick answers, or reach a human.</span>
                                            </span>
                                            <ArrowRight size={16} className="ml-auto flex-shrink-0" style={{ color: 'var(--primary)' }} />
                                        </button>

                                        <div>
                                            <p className="text-eyebrow mb-2">Popular guides</p>
                                            <div className="space-y-1.5">
                                                {articles.slice(0, 5).map((a) => (
                                                    <Link
                                                        key={a.slug}
                                                        href={`/help/${a.slug}`}
                                                        onClick={() => setOpen(false)}
                                                        className="flex items-center justify-between gap-2 rounded-lg p-2.5 transition-colors"
                                                        style={{ border: '1px solid var(--glass-border)' }}
                                                    >
                                                        <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-main)' }}>{a.title}</span>
                                                        <ArrowRight size={14} className="flex-shrink-0" style={{ color: 'var(--primary)' }} />
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={startTour}
                                            className="w-full flex items-center gap-3 rounded-xl p-3 text-left transition-all hover:brightness-105"
                                            style={{ border: '1px solid var(--glass-border)' }}
                                        >
                                            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}>
                                                <Compass size={18} />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block font-bold" style={{ color: 'var(--text-main)' }}>Take a quick tour</span>
                                                <span className="block text-xs" style={{ color: 'var(--text-dim)' }}>A 30-second walkthrough of the basics.</span>
                                            </span>
                                            <ArrowRight size={16} className="ml-auto flex-shrink-0" style={{ color: 'var(--primary)' }} />
                                        </button>

                                        <Link
                                            href="/help"
                                            onClick={() => setOpen(false)}
                                            className="flex items-center justify-center gap-2 text-sm font-bold pt-1"
                                            style={{ color: 'var(--primary)' }}
                                        >
                                            <BookOpen size={15} />
                                            Browse the full Help Center
                                        </Link>
                                    </>
                                )}
                            </div>
                        ) : (
                            /* Chat view */
                            <>
                                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {/* Greeting */}
                                    <div className="flex">
                                        <div className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-[14px] leading-relaxed" style={{ background: 'var(--bg-deep)', color: 'var(--text-main)', maxWidth: '85%' }}>
                                            {GREETING}
                                        </div>
                                    </div>

                                    {messages.length === 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {QUICK_QUESTIONS.map((q) => (
                                                <button
                                                    key={q}
                                                    type="button"
                                                    onClick={() => send(q)}
                                                    className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                                                    style={{ border: '1px solid var(--glass-border)', color: 'var(--text-main)' }}
                                                >
                                                    {q}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {messages.map((m, i) => (
                                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : ''}`}>
                                            <div
                                                className={`whitespace-pre-wrap px-3.5 py-2.5 text-[14px] leading-relaxed ${m.role === 'user' ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl rounded-tl-sm'}`}
                                                style={
                                                    m.role === 'user'
                                                        ? { background: 'var(--primary)', color: '#fff', maxWidth: '85%' }
                                                        : { background: 'var(--bg-deep)', color: 'var(--text-main)', maxWidth: '85%' }
                                                }
                                            >
                                                {m.content}
                                            </div>
                                        </div>
                                    ))}

                                    {sending && (
                                        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-dim)' }}>
                                            <Loader2 size={15} className="animate-spin" />
                                            Thinking…
                                        </div>
                                    )}

                                    {/* Escalation */}
                                    {escDone ? (
                                        <div className="flex items-start gap-2 rounded-xl p-3 text-[14px]" style={{ background: 'color-mix(in srgb, var(--success) 10%, transparent)', color: 'var(--text-main)' }}>
                                            <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--success)' }} />
                                            <span>Your question is on its way to the HayFlow team. We&apos;ll be in touch.</span>
                                        </div>
                                    ) : escOpen ? (
                                        <div className="rounded-xl p-3 space-y-2.5" style={{ border: '1px solid var(--glass-border)' }}>
                                            <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>Reach the team</p>
                                            <textarea
                                                value={escMsg}
                                                onChange={(e) => setEscMsg(e.target.value)}
                                                rows={3}
                                                placeholder="What do you need help with?"
                                                className="input-modern"
                                            />
                                            <input
                                                type="email"
                                                value={escEmail}
                                                onChange={(e) => setEscEmail(e.target.value)}
                                                placeholder="Reply-to email (optional)"
                                                className="input-modern"
                                            />
                                            <div className="flex gap-2">
                                                <button type="button" onClick={submitEscalation} disabled={escSending || !escMsg.trim()} aria-busy={escSending} className="btn btn-primary btn-sm flex-1">
                                                    {escSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                                                    Send to team
                                                </button>
                                                <button type="button" onClick={() => setEscOpen(false)} className="btn btn-ghost btn-sm">Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => { setEscOpen(true); if (!escMsg) setEscMsg(messages.filter(m => m.role === 'user').slice(-1)[0]?.content ?? ''); }}
                                            className="text-xs font-bold"
                                            style={{ color: 'var(--text-dim)' }}
                                        >
                                            Need a person? Reach the team →
                                        </button>
                                    )}
                                </div>

                                {/* Composer */}
                                <form
                                    onSubmit={(e) => { e.preventDefault(); send(input); }}
                                    className="flex items-center gap-2 p-3"
                                    style={{ borderTop: '1px solid var(--glass-border)' }}
                                >
                                    <input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Ask a question…"
                                        className="input-modern"
                                        aria-label="Ask the HayFlow assistant"
                                    />
                                    <button type="submit" disabled={sending || !input.trim()} aria-busy={sending} aria-label="Send" className="btn btn-primary" style={{ padding: '0.75rem' }}>
                                        <Send size={18} />
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
