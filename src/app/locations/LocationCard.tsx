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
        total_tons: number;
    };
}

export default function LocationCard({ location }: LocationCardProps) {
    const percentUsed = location.capacity > 0
        ? Math.min(100, Math.round((location.total_stock / location.capacity) * 100))
        : 0;
    const isNearCapacity = percentUsed > 90;
    const isEmpty = location.total_stock <= 0;

    return (
        <Link href={`/locations/${location.id}`} className="block">
            <div className="glass-card glass-card-link p-5">
                <div className="flex justify-between items-start gap-3 mb-4">
                    <div className="min-w-0 flex-1">
                        <h3 className="text-display-sm truncate">{location.name}</h3>
                        <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
                            {location.total_stock.toLocaleString()} bales · {location.total_tons.toFixed(2)} tons
                        </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                            className="font-bold tabular-nums"
                            style={{ color: isNearCapacity ? 'var(--error)' : isEmpty ? 'var(--text-dim)' : 'var(--primary-light)' }}
                        >
                            {percentUsed}%
                        </span>
                        <Link
                            href={`/locations/${location.id}/edit`}
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Edit location"
                            className="icon-button"
                        >
                            <Pencil size={14} />
                        </Link>
                    </div>
                </div>

                <div
                    className="h-2 rounded-full overflow-hidden mb-3"
                    style={{ background: 'var(--bg-surface)' }}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percentUsed}
                >
                    <div
                        className="h-full rounded-full transition-all"
                        style={{
                            width: `${percentUsed}%`,
                            background: isNearCapacity ? 'var(--error)' : 'var(--primary-light)',
                        }}
                    />
                </div>

                <div className="flex justify-between text-xs" style={{ color: 'var(--text-dim)' }}>
                    <span>
                        {location.stack_count} {location.stack_count === 1 ? 'lot' : 'lots'} stored
                    </span>
                    <span>Capacity: {location.capacity.toLocaleString()} {location.unit}</span>
                </div>
            </div>
        </Link>
    );
}
