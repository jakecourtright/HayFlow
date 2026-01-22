'use client';

import Link from "next/link";
import { Pencil } from "lucide-react";

interface LocationCardProps {
    location: {
        id: number;
        name: string;
        capacity: number;
        unit: string;
        total_stock: number;
        stack_count: number;
    };
}

export default function LocationCard({ location }: LocationCardProps) {
    const percentUsed = Math.min(100, Math.round((location.total_stock / location.capacity) * 100));
    const isNearCapacity = percentUsed > 90;

    return (
        <Link href={`/locations/${location.id}`} className="block">
            <div className="glass-card p-5 hover:border-[var(--primary)] transition-colors cursor-pointer">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--accent)' }}>{location.name}</h3>
                        <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
                            {location.total_stock.toLocaleString()} / {location.capacity.toLocaleString()} {location.unit}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="font-semibold" style={{ color: isNearCapacity ? '#ef4444' : 'var(--primary-light)' }}>
                            {percentUsed}%
                        </span>
                        <Link
                            href={`/locations/${location.id}/edit`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 rounded-lg transition-colors"
                            style={{ background: 'var(--bg-surface)' }}
                        >
                            <Pencil size={14} style={{ color: 'var(--text-dim)' }} />
                        </Link>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: 'var(--bg-surface)' }}>
                    <div
                        className="h-full rounded-full transition-all"
                        style={{
                            width: `${percentUsed}%`,
                            background: isNearCapacity ? '#ef4444' : 'var(--primary-light)'
                        }}
                    />
                </div>

                <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
                    {location.stack_count} {location.stack_count === 1 ? 'lot' : 'lots'} stored here
                </div>
            </div>
        </Link>
    );
}
