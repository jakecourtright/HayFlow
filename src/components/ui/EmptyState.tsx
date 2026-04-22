import Link from "next/link";

interface CtaConfig {
    href: string;
    label: string;
}

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    body: string;
    cta?: CtaConfig;
    secondaryCta?: CtaConfig;
    // Legacy flat props (still supported)
    ctaHref?: string;
    ctaLabel?: string;
    secondaryHref?: string;
    secondaryLabel?: string;
}

export default function EmptyState({
    icon,
    title,
    body,
    cta,
    secondaryCta,
    ctaHref,
    ctaLabel,
    secondaryHref,
    secondaryLabel,
}: EmptyStateProps) {
    const primary = cta || (ctaHref && ctaLabel ? { href: ctaHref, label: ctaLabel } : null);
    const secondary = secondaryCta || (secondaryHref && secondaryLabel ? { href: secondaryHref, label: secondaryLabel } : null);

    return (
        <div className="empty-state">
            <div className="empty-state-icon">{icon}</div>
            <h2 className="text-display-sm mb-1">{title}</h2>
            <p className="text-sm mx-auto max-w-sm" style={{ color: "var(--text-dim)" }}>
                {body}
            </p>
            {(primary || secondary) && (
                <div className="flex flex-col sm:flex-row gap-2 justify-center mt-5">
                    {primary && (
                        <Link href={primary.href} className="btn btn-primary">
                            {primary.label}
                        </Link>
                    )}
                    {secondary && (
                        <Link href={secondary.href} className="btn btn-ghost">
                            {secondary.label}
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
