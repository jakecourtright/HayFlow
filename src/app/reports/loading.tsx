export default function ReportsLoading() {
    return (
        <div className="space-y-6" aria-busy="true" aria-live="polite">
            <div>
                <div className="h-3 w-20 rounded mb-2 skeleton-shimmer" style={{ background: 'var(--bg-surface)' }} />
                <div className="h-7 w-64 rounded mb-2 skeleton-shimmer" style={{ background: 'var(--bg-surface)' }} />
                <div className="h-4 w-80 rounded skeleton-shimmer" style={{ background: 'var(--bg-surface)' }} />
            </div>

            <div className="flex gap-2">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-8 w-20 rounded-lg skeleton-shimmer" style={{ background: 'var(--bg-surface)' }} />
                ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="glass-card py-4 px-5 space-y-2">
                        <div className="h-3 w-16 rounded skeleton-shimmer" style={{ background: 'var(--bg-surface)' }} />
                        <div className="h-8 w-24 rounded skeleton-shimmer" style={{ background: 'var(--bg-surface)' }} />
                        <div className="h-3 w-20 rounded skeleton-shimmer" style={{ background: 'var(--bg-surface)' }} />
                    </div>
                ))}
            </div>

            <div className="glass-card py-5 px-6">
                <div className="h-4 w-48 rounded mb-4 skeleton-shimmer" style={{ background: 'var(--bg-surface)' }} />
                <div className="h-64 w-full rounded-lg skeleton-shimmer" style={{ background: 'var(--bg-surface)' }} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card py-5 px-6">
                    <div className="h-4 w-40 rounded mb-4 skeleton-shimmer" style={{ background: 'var(--bg-surface)' }} />
                    <div className="h-48 w-full rounded-lg skeleton-shimmer" style={{ background: 'var(--bg-surface)' }} />
                </div>
                <div className="glass-card py-5 px-6">
                    <div className="h-4 w-40 rounded mb-4 skeleton-shimmer" style={{ background: 'var(--bg-surface)' }} />
                    <div className="h-48 w-full rounded-lg skeleton-shimmer" style={{ background: 'var(--bg-surface)' }} />
                </div>
            </div>

            <span className="sr-only">Loading financial reports…</span>
        </div>
    );
}
