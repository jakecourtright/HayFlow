'use client';

import { Printer } from 'lucide-react';

export default function PrintButton() {
    return (
        <div className="flex justify-end print-hide">
            <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-secondary"
            >
                <Printer size={16} />
                Print invoice
            </button>
        </div>
    );
}
