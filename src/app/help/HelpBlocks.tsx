import { Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { HelpBlock } from '@/lib/help-content';

const CALLOUT_META = {
    info: { icon: Info, color: 'var(--primary)' },
    warning: { icon: AlertTriangle, color: 'var(--warning)' },
    success: { icon: CheckCircle2, color: 'var(--success)' },
} as const;

/** Renders a help article's structured body. Pure/static — safe as a server component. */
export default function HelpBlocks({ blocks }: { blocks: HelpBlock[] }) {
    return (
        <div className="space-y-4">
            {blocks.map((block, i) => {
                switch (block.type) {
                    case 'p':
                        return (
                            <p key={i} className="text-[15px] leading-relaxed" style={{ color: 'var(--text-main)' }}>
                                {block.text}
                            </p>
                        );
                    case 'h':
                        return (
                            <h2 key={i} className="text-display-sm mt-6">
                                {block.text}
                            </h2>
                        );
                    case 'list':
                        return (
                            <ul key={i} className="space-y-2">
                                {block.items.map((item, j) => (
                                    <li key={j} className="flex gap-2.5 text-[15px] leading-relaxed" style={{ color: 'var(--text-main)' }}>
                                        <span
                                            className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                                            style={{ background: 'var(--primary)' }}
                                        />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        );
                    case 'steps':
                        return (
                            <ol key={i} className="space-y-2.5">
                                {block.items.map((item, j) => (
                                    <li key={j} className="flex gap-3 text-[15px] leading-relaxed" style={{ color: 'var(--text-main)' }}>
                                        <span
                                            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                                            style={{
                                                background: 'color-mix(in srgb, var(--primary) 14%, transparent)',
                                                color: 'var(--primary)',
                                            }}
                                        >
                                            {j + 1}
                                        </span>
                                        <span className="pt-0.5">{item}</span>
                                    </li>
                                ))}
                            </ol>
                        );
                    case 'callout': {
                        const meta = CALLOUT_META[block.tone];
                        const Icon = meta.icon;
                        return (
                            <div
                                key={i}
                                className="flex items-start gap-2.5 rounded-xl p-3 text-[14px] leading-relaxed"
                                style={{
                                    background: `color-mix(in srgb, ${meta.color} 10%, transparent)`,
                                    color: 'var(--text-main)',
                                }}
                            >
                                <Icon size={16} className="mt-0.5 flex-shrink-0" style={{ color: meta.color }} />
                                <span>{block.text}</span>
                            </div>
                        );
                    }
                    default:
                        return null;
                }
            })}
        </div>
    );
}
