import type { BusinessProfile } from "@/app/actions";

interface InvoiceFromBlockProps {
    profile: BusinessProfile | null;
}

export default function InvoiceFromBlock({ profile }: InvoiceFromBlockProps) {
    if (!profile || !profile.name) return null;

    const cityStateZip = [profile.city, profile.state].filter(Boolean).join(', ') +
        (profile.zip ? ` ${profile.zip}` : '');

    return (
        <div>
            <p className="text-eyebrow mb-0.5">From</p>
            <p className="text-lg font-semibold" style={{ color: 'var(--text-main)' }}>{profile.name}</p>
            <div className="text-sm leading-snug" style={{ color: 'var(--text-dim)' }}>
                {profile.address_line1 && <p>{profile.address_line1}</p>}
                {profile.address_line2 && <p>{profile.address_line2}</p>}
                {cityStateZip.trim() && <p>{cityStateZip}</p>}
                {(profile.phone || profile.email) && (
                    <p>
                        {profile.phone}
                        {profile.phone && profile.email && <span> &middot; </span>}
                        {profile.email}
                    </p>
                )}
            </div>
        </div>
    );
}
