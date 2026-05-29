'use client';

import { Compass } from 'lucide-react';

// Tiny client trigger so server components (e.g. the onboarding checklist) can
// launch a guided tour. Omitting tourId lets TourGuide pick the role's tour.
export default function StartTourButton({
    tourId,
    label = 'Take a tour',
}: {
    tourId?: string;
    label?: string;
}) {
    return (
        <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('hayflow:start-tour', { detail: { tourId } }))}
            className="inline-flex items-center gap-1.5 text-sm font-bold"
            style={{ color: 'var(--primary)' }}
        >
            <Compass size={15} />
            {label}
        </button>
    );
}
