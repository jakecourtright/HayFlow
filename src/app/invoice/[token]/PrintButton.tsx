'use client';

import { Printer } from 'lucide-react';

export default function PrintButton() {
    return (
        <div className="flex justify-end print-hide">
            <button
                onClick={() => window.print()}
                className="btn flex items-center gap-2 px-4 py-2"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-main)' }}
            >
                <Printer size={16} />
                Print Invoice
            </button>
        </div>
    );
}
