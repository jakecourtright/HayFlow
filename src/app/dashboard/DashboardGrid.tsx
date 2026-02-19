'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Tractor, ShoppingCart, Banknote, Wrench, ArrowRight, GripVertical, Pencil, X, Eye, EyeOff } from 'lucide-react';
import { saveDashboardLayout, DashboardLayout } from '@/app/actions';
import StatCard from './StatCard';

interface DashboardStats {
    totalStock: number;
    stockByCommodity: { commodity: string; tons: number }[];
    salesThisMonth: number;
    balesMovedThisMonth: number;
    recentActivity: any[];
}

interface DashboardGridProps {
    stats: DashboardStats;
    layout: DashboardLayout;
    canWriteInventory: boolean;
}

const ALL_CARDS = [
    { id: 'total-stock', label: 'Total Stock' },
    { id: 'stock-by-commodity', label: 'Stock by Commodity' },
    { id: 'sales-this-month', label: 'Sales This Month' },
    { id: 'bales-moved', label: 'Bales Moved' },
    { id: 'action-cards', label: 'Quick Actions' },
    { id: 'recent-activity', label: 'Recent Activity' },
];

export default function DashboardGrid({ stats, layout: initialLayout, canWriteInventory }: DashboardGridProps) {
    const [layout, setLayout] = useState<DashboardLayout>(initialLayout);
    const [editMode, setEditMode] = useState(false);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const dragCounter = useRef<Record<string, number>>({});

    const visibleCards = layout.order.filter(id => !layout.hidden.includes(id));
    const hiddenCards = ALL_CARDS.filter(c => layout.hidden.includes(c.id));

    const persistLayout = useCallback(async (newLayout: DashboardLayout) => {
        setLayout(newLayout);
        setSaving(true);
        try {
            await saveDashboardLayout(newLayout);
        } catch (e) {
            console.error('Failed to save layout', e);
        } finally {
            setSaving(false);
        }
    }, []);

    const handleDragStart = (e: React.DragEvent, cardId: string) => {
        setDraggedId(cardId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', cardId);
        // Make the drag image slightly transparent
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '0.5';
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '1';
        }
        setDraggedId(null);
        setDragOverId(null);
        dragCounter.current = {};
    };

    const handleDragEnter = (e: React.DragEvent, cardId: string) => {
        e.preventDefault();
        dragCounter.current[cardId] = (dragCounter.current[cardId] || 0) + 1;
        if (cardId !== draggedId) {
            setDragOverId(cardId);
        }
    };

    const handleDragLeave = (e: React.DragEvent, cardId: string) => {
        e.preventDefault();
        dragCounter.current[cardId] = (dragCounter.current[cardId] || 0) - 1;
        if (dragCounter.current[cardId] <= 0) {
            dragCounter.current[cardId] = 0;
            if (dragOverId === cardId) {
                setDragOverId(null);
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        const sourceId = e.dataTransfer.getData('text/plain');
        if (!sourceId || sourceId === targetId) return;

        const newOrder = [...layout.order];
        const sourceIdx = newOrder.indexOf(sourceId);
        const targetIdx = newOrder.indexOf(targetId);
        if (sourceIdx === -1 || targetIdx === -1) return;

        newOrder.splice(sourceIdx, 1);
        newOrder.splice(targetIdx, 0, sourceId);

        persistLayout({ ...layout, order: newOrder });
    };

    const toggleCardVisibility = (cardId: string) => {
        const newHidden = layout.hidden.includes(cardId)
            ? layout.hidden.filter(id => id !== cardId)
            : [...layout.hidden, cardId];
        persistLayout({ ...layout, hidden: newHidden });
    };

    const addCard = (cardId: string) => {
        const newHidden = layout.hidden.filter(id => id !== cardId);
        // If the card isn't in order yet, add it
        const newOrder = layout.order.includes(cardId)
            ? layout.order
            : [...layout.order, cardId];
        persistLayout({ ...layout, order: newOrder, hidden: newHidden });
    };

    function renderCard(cardId: string) {
        switch (cardId) {
            case 'total-stock':
                return (
                    <StatCard
                        label="Total Stock"
                        value={Number(stats.totalStock).toLocaleString()}
                        subtitle="Bales on hand"
                    />
                );

            case 'stock-by-commodity':
                return (
                    <div className="glass-card py-5 px-6">
                        <span className="label-modern" style={{ marginBottom: '12px', display: 'block' }}>
                            Stock by Commodity
                        </span>
                        {stats.stockByCommodity.length === 0 ? (
                            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>No stock data</p>
                        ) : (
                            <div className="space-y-3">
                                {stats.stockByCommodity.map(item => (
                                    <div key={item.commodity} className="flex items-center justify-between">
                                        <span className="font-medium" style={{ color: 'var(--text-main)' }}>
                                            {item.commodity}
                                        </span>
                                        <span className="font-bold text-lg" style={{ color: 'var(--primary-light)' }}>
                                            {item.tons.toFixed(1)} <span className="text-sm font-normal" style={{ color: 'var(--text-dim)' }}>tons</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

            case 'sales-this-month':
                if (!canWriteInventory) return null;
                return (
                    <StatCard
                        label="Sales This Month"
                        value={`$${Number(stats.salesThisMonth).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                        subtitle={new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                        accent
                    />
                );

            case 'bales-moved':
                return (
                    <StatCard
                        label="Bales Moved"
                        value={Number(stats.balesMovedThisMonth).toLocaleString()}
                        subtitle="This month (all types)"
                    />
                );

            case 'action-cards':
                if (!canWriteInventory) {
                    // Drivers see a simplified set of actions
                    return (
                        <div className="grid grid-cols-2 gap-4">
                            <Link href="/tickets/new" className="glass-card flex flex-col items-center justify-center p-6 hover:brightness-110 transition-all active:scale-95 text-center group border-2 border-transparent hover:border-[var(--primary)] aspect-square">
                                <Banknote size={52} style={{ color: 'var(--primary)', marginBottom: '14px' }} />
                                <span className="font-bold text-2xl" style={{ color: 'var(--text-main)' }}>Ticket</span>
                                <span className="text-sm mt-1 opacity-80" style={{ color: 'var(--text-dim)' }}>New Ticket</span>
                            </Link>
                        </div>
                    );
                }
                return (
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/log?type=production" className="glass-card flex flex-col items-center justify-center p-6 hover:brightness-110 transition-all active:scale-95 text-center group border-2 border-transparent hover:border-[var(--primary)] aspect-square">
                            <Tractor size={52} style={{ color: 'var(--primary)', marginBottom: '14px' }} />
                            <span className="font-bold text-2xl" style={{ color: 'var(--text-main)' }}>Bale</span>
                            <span className="text-sm mt-1 opacity-80" style={{ color: 'var(--text-dim)' }}>Production</span>
                        </Link>
                        <Link href="/log?type=purchase" className="glass-card flex flex-col items-center justify-center p-6 hover:brightness-110 transition-all active:scale-95 text-center group border-2 border-transparent hover:border-[var(--primary)] aspect-square">
                            <ShoppingCart size={52} style={{ color: 'var(--primary)', marginBottom: '14px' }} />
                            <span className="font-bold text-2xl" style={{ color: 'var(--text-main)' }}>Buy</span>
                            <span className="text-sm mt-1 opacity-80" style={{ color: 'var(--text-dim)' }}>Purchase</span>
                        </Link>
                        <Link href="/sell" className="glass-card flex flex-col items-center justify-center p-6 hover:brightness-110 transition-all active:scale-95 text-center group border-2 border-transparent hover:border-[var(--primary)] aspect-square">
                            <Banknote size={52} style={{ color: 'var(--primary)', marginBottom: '14px' }} />
                            <span className="font-bold text-2xl" style={{ color: 'var(--text-main)' }}>Sell</span>
                            <span className="text-sm mt-1 opacity-80" style={{ color: 'var(--text-dim)' }}>Sale</span>
                        </Link>
                        <Link href="/log?type=adjustment" className="glass-card flex flex-col items-center justify-center p-6 hover:brightness-110 transition-all active:scale-95 text-center group border-2 border-transparent hover:border-[var(--primary)] aspect-square">
                            <Wrench size={52} style={{ color: 'var(--primary)', marginBottom: '14px' }} />
                            <span className="font-bold text-2xl" style={{ color: 'var(--text-main)' }}>Adjust</span>
                            <span className="text-sm mt-1 opacity-80" style={{ color: 'var(--text-dim)' }}>Inventory</span>
                        </Link>
                    </div>
                );

            case 'recent-activity':
                return (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold" style={{ color: 'var(--accent)' }}>Recent Activity</h2>
                            <Link href="/transactions" className="text-sm flex items-center gap-1 hover:opacity-80" style={{ color: 'var(--primary-light)' }}>
                                View All <ArrowRight size={14} />
                            </Link>
                        </div>
                        <div className="flex flex-col gap-2">
                            {stats.recentActivity.length === 0 ? (
                                <div className="text-center py-8" style={{ color: 'var(--text-dim)' }}>No recent activity found.</div>
                            ) : (
                                stats.recentActivity.map((tx: any) => (
                                    <Link key={tx.id} href={`/transactions/${tx.id}`} className="block">
                                        <div className="glass-card flex items-center justify-between py-4 px-5 !rounded-2xl hover:brightness-110 transition-all">
                                            <div>
                                                <div className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>
                                                    {tx.type === 'production' ? 'Baled' : tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}: {tx.stack_name || 'Unknown Stack'}
                                                </div>
                                                <div className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                                                    {tx.commodity} • {new Date(tx.date).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div
                                                className="font-mono font-bold"
                                                style={{ color: tx.type === 'sale' ? '#ef4444' : 'var(--primary-light)' }}
                                            >
                                                {tx.type === 'sale' ? '−' : '+'}{Number(tx.amount).toLocaleString()}
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                );

            default:
                return null;
        }
    }

    return (
        <div className="space-y-4">
            {/* Edit Mode Toggle */}
            <div className="flex justify-end">
                <button
                    onClick={() => setEditMode(!editMode)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
                    style={{
                        background: editMode ? 'var(--primary)' : 'var(--bg-surface)',
                        color: editMode ? 'white' : 'var(--text-dim)',
                        border: `1px solid ${editMode ? 'var(--primary)' : 'var(--glass-border)'}`,
                    }}
                >
                    {editMode ? <X size={14} /> : <Pencil size={14} />}
                    {editMode ? 'Done' : 'Customize'}
                    {saving && <span className="ml-1 opacity-60">saving…</span>}
                </button>
            </div>

            {/* Hidden cards panel (edit mode only) */}
            {editMode && hiddenCards.length > 0 && (
                <div className="glass-card py-4 px-5">
                    <span className="label-modern" style={{ marginBottom: '8px', display: 'block' }}>Hidden Cards</span>
                    <div className="flex flex-wrap gap-2">
                        {hiddenCards.map(card => (
                            <button
                                key={card.id}
                                onClick={() => addCard(card.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:brightness-110"
                                style={{
                                    background: 'var(--bg-deep)',
                                    color: 'var(--text-dim)',
                                    border: '1px solid var(--glass-border)',
                                }}
                            >
                                <Eye size={12} />
                                {card.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Dashboard Cards */}
            {visibleCards.map(cardId => (
                <div
                    key={cardId}
                    draggable={editMode}
                    onDragStart={editMode ? (e) => handleDragStart(e, cardId) : undefined}
                    onDragEnd={editMode ? handleDragEnd : undefined}
                    onDragEnter={editMode ? (e) => handleDragEnter(e, cardId) : undefined}
                    onDragLeave={editMode ? (e) => handleDragLeave(e, cardId) : undefined}
                    onDragOver={editMode ? handleDragOver : undefined}
                    onDrop={editMode ? (e) => handleDrop(e, cardId) : undefined}
                    className={`dashboard-card ${editMode ? 'dashboard-card-edit' : ''} ${dragOverId === cardId ? 'dashboard-drop-target' : ''} ${draggedId === cardId ? 'dashboard-card-dragging' : ''}`}
                    style={{ position: 'relative' }}
                >
                    {/* Edit mode overlay controls */}
                    {editMode && (
                        <div className="flex items-center justify-between mb-3 px-1">
                            <div className="flex items-center gap-2" style={{ color: 'var(--text-dim)', cursor: 'grab' }}>
                                <GripVertical size={16} />
                                <span className="text-xs font-bold uppercase tracking-wider">
                                    {ALL_CARDS.find(c => c.id === cardId)?.label}
                                </span>
                            </div>
                            <button
                                onClick={() => toggleCardVisibility(cardId)}
                                className="p-1 rounded-lg hover:bg-[var(--bg-deep)] transition-colors"
                                style={{ color: 'var(--text-dim)' }}
                                title="Hide this card"
                            >
                                <EyeOff size={14} />
                            </button>
                        </div>
                    )}
                    {renderCard(cardId)}
                </div>
            ))}
        </div>
    );
}
