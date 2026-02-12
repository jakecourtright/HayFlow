"use client";

import { useTheme } from "../contexts/theme-context";
import { Check } from "lucide-react";
import { OrganizationProfile, OrganizationSwitcher, Protect } from "@clerk/nextjs";

const THEMES = [
    // Dark Themes
    {
        id: "sunset" as const,
        name: "Sunset",
        label: "Dark",
        colors: ["#1e293b", "#F43F5E", "#FB7185", "#FFD4C1"],
        nameColor: "#FFD4C1",
        checkColor: "#F43F5E",
        bgPreview: "#1e293b",
    },
    {
        id: "forest" as const,
        name: "Forest",
        label: "Dark",
        colors: ["#0f2329", "#2dd4bf", "#5eead4", "#ccfbf1"],
        nameColor: "#ccfbf1",
        checkColor: "#2dd4bf",
        bgPreview: "#0f2329",
    },
    {
        id: "strawberry" as const,
        name: "Strawberry",
        label: "Dark",
        colors: ["#203838", "#FF4D6D", "#FF8FA3", "#FFE5D9"],
        nameColor: "#FFE5D9",
        checkColor: "#FF4D6D",
        bgPreview: "#203838",
    },
    {
        id: "midnight" as const,
        name: "Midnight",
        label: "Dark",
        colors: ["#13111C", "#7C3AED", "#A78BFA", "#E0D4FC"],
        nameColor: "#E0D4FC",
        checkColor: "#7C3AED",
        bgPreview: "#13111C",
    },
    {
        id: "ember" as const,
        name: "Ember",
        label: "Dark",
        colors: ["#1C1410", "#EA580C", "#FB923C", "#FED7AA"],
        nameColor: "#FED7AA",
        checkColor: "#EA580C",
        bgPreview: "#1C1410",
    },
    {
        id: "ocean" as const,
        name: "Ocean",
        label: "Dark",
        colors: ["#0B1526", "#0891B2", "#22D3EE", "#CFFAFE"],
        nameColor: "#CFFAFE",
        checkColor: "#0891B2",
        bgPreview: "#0B1526",
    },
    {
        id: "slate" as const,
        name: "Slate",
        label: "Dark",
        colors: ["#18181B", "#3B82F6", "#60A5FA", "#E2E8F0"],
        nameColor: "#E2E8F0",
        checkColor: "#3B82F6",
        bgPreview: "#18181B",
    },
    {
        id: "moss" as const,
        name: "Moss",
        label: "Dark",
        colors: ["#141E14", "#65A30D", "#84CC16", "#ECFCCB"],
        nameColor: "#ECFCCB",
        checkColor: "#65A30D",
        bgPreview: "#141E14",
    },
    // Light Themes
    {
        id: "sand" as const,
        name: "Sand",
        label: "Light",
        colors: ["#F5F0EB", "#C2410C", "#EA580C", "#292524"],
        nameColor: "#292524",
        checkColor: "#C2410C",
        bgPreview: "#F5F0EB",
    },
    {
        id: "cloud" as const,
        name: "Cloud",
        label: "Light",
        colors: ["#F1F5F9", "#4F46E5", "#6366F1", "#1E293B"],
        nameColor: "#1E293B",
        checkColor: "#4F46E5",
        bgPreview: "#F1F5F9",
    },
    {
        id: "mint" as const,
        name: "Mint",
        label: "Light",
        colors: ["#F0FDF4", "#059669", "#10B981", "#14532D"],
        nameColor: "#14532D",
        checkColor: "#059669",
        bgPreview: "#F0FDF4",
    },
    {
        id: "blush" as const,
        name: "Blush",
        label: "Light",
        colors: ["#FFF1F2", "#E11D48", "#FB7185", "#4C1D2F"],
        nameColor: "#4C1D2F",
        checkColor: "#E11D48",
        bgPreview: "#FFF1F2",
    },
    {
        id: "arctic" as const,
        name: "Arctic",
        label: "Light",
        colors: ["#F0FDFA", "#0D9488", "#14B8A6", "#134E4A"],
        nameColor: "#134E4A",
        checkColor: "#0D9488",
        bgPreview: "#F0FDFA",
    },
    {
        id: "prairie" as const,
        name: "Prairie",
        label: "Light",
        colors: ["#F3F1EA", "#5B7553", "#6B8F63", "#3B3F2E"],
        nameColor: "#3B3F2E",
        checkColor: "#5B7553",
        bgPreview: "#F3F1EA",
    },
    {
        id: "harvest" as const,
        name: "Harvest",
        label: "Light",
        colors: ["#F5F0E1", "#92702A", "#B8942D", "#3D3322"],
        nameColor: "#3D3322",
        checkColor: "#92702A",
        bgPreview: "#F5F0E1",
    },
];

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();

    const darkThemes = THEMES.filter(t => t.label === "Dark");
    const lightThemes = THEMES.filter(t => t.label === "Light");

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>Settings</h1>

            {/* Organization Switcher */}
            <div className="glass-card">
                <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-main)' }}>Organization</h2>
                <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>
                    Switch between your organizations or create a new one.
                </p>
                <OrganizationSwitcher
                    hidePersonal
                    appearance={{
                        elements: {
                            rootBox: "w-full",
                            organizationSwitcherTrigger: "w-full py-3 px-4 rounded-xl border transition-colors text-[var(--text-main)]",
                        }
                    }}
                />
            </div>

            {/* Team Management — only visible to users with manage permission */}
            <Protect permission="org:users:manage">
                <div className="glass-card">
                    <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-main)' }}>Team Management</h2>
                    <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>
                        Invite members, assign roles, and manage your team.
                    </p>
                    <div className="clerk-org-profile-wrapper">
                        <style>{`
                            .clerk-org-profile-wrapper .cl-organizationProfile-root {
                                width: 100%;
                                max-width: 100%;
                            }
                            .clerk-org-profile-wrapper .cl-card {
                                box-shadow: none;
                                border: none;
                                background: transparent;
                                width: 100%;
                                max-width: 100%;
                            }
                            .clerk-org-profile-wrapper .cl-navbar {
                                display: none !important;
                            }
                            .clerk-org-profile-wrapper .cl-navbarMobileMenuButton {
                                display: none !important;
                            }
                            .clerk-org-profile-wrapper .cl-headerTitle,
                            .clerk-org-profile-wrapper .cl-headerSubtitle {
                                display: none !important;
                            }
                            .clerk-org-profile-wrapper .cl-pageScrollBox {
                                padding: 0;
                                overflow: visible;
                            }
                            .clerk-org-profile-wrapper .cl-profileSection__organizationProfile,
                            .clerk-org-profile-wrapper .cl-profileSection__organizationDanger {
                                display: none !important;
                            }
                            .clerk-org-profile-wrapper .cl-footer {
                                display: none !important;
                            }
                        `}</style>
                        <OrganizationProfile routing="hash" />
                    </div>
                </div>
            </Protect>

            {/* Theme Selection */}
            <div className="glass-card">
                <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-main)' }}>Theme</h2>

                {/* Dark Themes */}
                <h3 className="text-xs font-bold uppercase tracking-wider mt-4 mb-3" style={{ color: 'var(--text-dim)' }}>
                    Dark Themes
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {darkThemes.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className={`relative rounded-xl p-3 border-2 transition-all duration-200 text-left ${theme === t.id
                                ? "border-[var(--primary)] scale-[1.02]"
                                : "border-transparent hover:border-[var(--glass-border)]"
                                }`}
                            style={{ background: t.bgPreview }}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-sm" style={{ color: t.nameColor }}>
                                    {t.name}
                                </span>
                                {theme === t.id && <Check className="w-4 h-4" style={{ color: t.checkColor }} />}
                            </div>
                            <div className="flex gap-1.5">
                                {t.colors.map((c, i) => (
                                    <div
                                        key={i}
                                        className="w-6 h-6 rounded-full"
                                        style={{ background: c, border: '1px solid rgba(255,255,255,0.1)' }}
                                    />
                                ))}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Light Themes */}
                <h3 className="text-xs font-bold uppercase tracking-wider mt-6 mb-3" style={{ color: 'var(--text-dim)' }}>
                    Light Themes
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {lightThemes.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className={`relative rounded-xl p-3 border-2 transition-all duration-200 text-left ${theme === t.id
                                ? "border-[var(--primary)] scale-[1.02]"
                                : "border-transparent hover:border-[var(--glass-border)]"
                                }`}
                            style={{ background: t.bgPreview }}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-sm" style={{ color: t.nameColor }}>
                                    {t.name}
                                </span>
                                {theme === t.id && <Check className="w-4 h-4" style={{ color: t.checkColor }} />}
                            </div>
                            <div className="flex gap-1.5">
                                {t.colors.map((c, i) => (
                                    <div
                                        key={i}
                                        className="w-6 h-6 rounded-full"
                                        style={{ background: c, border: '1px solid rgba(0,0,0,0.1)' }}
                                    />
                                ))}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

