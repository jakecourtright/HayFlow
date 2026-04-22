'use client';

import { Printer } from 'lucide-react';

interface PrintButtonProps {
    label?: string;
    className?: string;
}

export default function PrintButton({ label = 'Print invoice', className = 'btn btn-secondary' }: PrintButtonProps) {
    return (
        <button
            type="button"
            onClick={() => window.print()}
            className={`${className} print-hide`}
        >
            <Printer size={16} />
            {label}
        </button>
    );
}
