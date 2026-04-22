import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    backHref?: string;
    backLabel?: string;
    actions?: React.ReactNode;
}

export default function PageHeader({
    eyebrow,
    title,
    subtitle,
    backHref,
    backLabel = "Back",
    actions,
}: PageHeaderProps) {
    return (
        <div className="mb-6">
            {backHref && (
                <Link href={backHref} className="page-header-back">
                    <ChevronLeft size={16} />
                    {backLabel}
                </Link>
            )}
            <div className="page-header">
                <div className="min-w-0 flex-1">
                    {eyebrow && <span className="text-eyebrow">{eyebrow}</span>}
                    <h1 className="text-display-lg mt-1">{title}</h1>
                    {subtitle && (
                        <p className="mt-1 text-sm" style={{ color: "var(--text-dim)" }}>
                            {subtitle}
                        </p>
                    )}
                </div>
                {actions && <div className="flex-shrink-0 flex items-center gap-2">{actions}</div>}
            </div>
        </div>
    );
}
