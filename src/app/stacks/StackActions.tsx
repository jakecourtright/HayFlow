'use client';

import { deleteStack } from "@/app/actions";
import { Trash2 } from "lucide-react";

export default function StackActions({ stackId }: { stackId: number }) {
    async function handleDelete() {
        if (confirm('Are you sure you want to delete this stack? Transaction history will be preserved but will reference a deleted stack.')) {
            try {
                await deleteStack(stackId.toString());
            } catch (error: any) {
                alert(error.message || 'Failed to delete stack');
            }
        }
    }

    return (
        <button
            onClick={handleDelete}
            className="p-2 rounded-lg transition-colors"
            style={{ background: 'var(--bg-surface)' }}
        >
            <Trash2 size={14} className="text-red-400" />
        </button>
    );
}
