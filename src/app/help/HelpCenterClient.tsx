'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
    Search, Sparkles, Box, Receipt, FileText, BarChart3, Users, Settings,
    ArrowRight, MessageCircleQuestion,
} from 'lucide-react';
import {
    HELP_CATEGORIES, searchArticles,
    type HelpArticle, type HelpCategoryId,
} from '@/lib/help-content';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
    Sparkles, Box, Receipt, FileText, BarChart3, Users, Settings,
};

const AUDIENCE_TAG: Record<HelpArticle['audience'], string | null> = {
    all: null,
    office: 'Office',
    driver: 'Drivers',
};

function ArticleCard({ article }: { article: HelpArticle }) {
    const tag = AUDIENCE_TAG[article.audience];
    return (
        <Link href={`/help/${article.slug}`} className="glass-card-link p-4 block">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold" style={{ color: 'var(--text-main)' }}>
                            {article.title}
                        </span>
                        {tag && <span className="chip chip-muted chip-sm">{tag}</span>}
                    </div>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>
                        {article.summary}
                    </p>
                </div>
                <ArrowRight size={16} className="flex-shrink-0 mt-1" style={{ color: 'var(--primary)' }} />
            </div>
        </Link>
    );
}

export default function HelpCenterClient({ articles }: { articles: HelpArticle[] }) {
    const [query, setQuery] = useState('');

    const results = useMemo(() => searchArticles(query, articles), [query, articles]);
    const searching = query.trim().length > 0;

    // Group role-visible articles by category, preserving category display order.
    const grouped = useMemo(() => {
        return HELP_CATEGORIES
            .map((cat) => ({
                cat,
                items: articles.filter((a) => a.category === (cat.id as HelpCategoryId)),
            }))
            .filter((g) => g.items.length > 0);
    }, [articles]);

    function askHayFlow() {
        window.dispatchEvent(new CustomEvent('hayflow:open-help'));
    }

    return (
        <div className="space-y-6">
            {/* Search + ask */}
            <div className="space-y-3">
                <div className="relative">
                    <Search
                        size={18}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: 'var(--text-dim)' }}
                    />
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search help — try “invoice” or “stack”"
                        className="input-modern"
                        style={{ paddingLeft: '2.75rem' }}
                        aria-label="Search help articles"
                    />
                </div>
                <button
                    type="button"
                    onClick={askHayFlow}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:brightness-105"
                    style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)', border: '1px solid var(--glass-border)' }}
                >
                    <span
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                        style={{ background: 'color-mix(in srgb, var(--primary) 16%, transparent)', color: 'var(--primary)' }}
                    >
                        <MessageCircleQuestion size={18} />
                    </span>
                    <span className="min-w-0">
                        <span className="block font-bold" style={{ color: 'var(--text-main)' }}>Ask HayFlow</span>
                        <span className="block text-xs" style={{ color: 'var(--text-dim)' }}>
                            Get a quick answer, or reach a human.
                        </span>
                    </span>
                    <ArrowRight size={16} className="ml-auto flex-shrink-0" style={{ color: 'var(--primary)' }} />
                </button>
            </div>

            {/* Results */}
            {searching ? (
                results.length > 0 ? (
                    <div className="space-y-2">
                        <p className="text-eyebrow">{results.length} result{results.length === 1 ? '' : 's'}</p>
                        {results.map((a) => <ArticleCard key={a.slug} article={a} />)}
                    </div>
                ) : (
                    <div className="surface-card text-center py-8">
                        <p className="font-bold" style={{ color: 'var(--text-main)' }}>No matches for “{query}”</p>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>
                            Try a different word, or tap Ask HayFlow above.
                        </p>
                    </div>
                )
            ) : (
                <div className="space-y-7">
                    {grouped.map(({ cat, items }) => {
                        const Icon = CATEGORY_ICONS[cat.icon] ?? Sparkles;
                        return (
                            <section key={cat.id}>
                                <div className="flex items-center gap-2.5 mb-3">
                                    <span
                                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                                        style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}
                                    >
                                        <Icon size={16} />
                                    </span>
                                    <div>
                                        <h2 className="font-bold leading-tight" style={{ color: 'var(--text-main)' }}>{cat.label}</h2>
                                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{cat.blurb}</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {items.map((a) => <ArticleCard key={a.slug} article={a} />)}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
