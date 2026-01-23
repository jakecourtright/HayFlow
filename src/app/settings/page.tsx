"use client";

import { useTheme } from "../contexts/theme-context";
import { Check } from "lucide-react";

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>Settings</h1>

            <div className="glass-card">
                <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-main)' }}>Theme</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Sunset Theme Option */}
                    <button
                        onClick={() => setTheme("sunset")}
                        className={`relative group rounded-xl p-4 border-2 transition-all duration-200 text-left ${theme === "sunset"
                                ? "border-[var(--primary)] bg-[var(--bg-deep)]"
                                : "border-transparent bg-[var(--bg-deep)]/50 hover:bg-[var(--bg-deep)]"
                            }`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="font-bold text-lg" style={{ color: '#F8B195' }}>Sunset</span>
                            {theme === "sunset" && <Check className="w-5 h-5 text-[var(--primary)]" />}
                        </div>
                        <div className="flex gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#355C7D]" title="Background"></div>
                            <div className="w-8 h-8 rounded-full bg-[#C06C84]" title="Primary"></div>
                            <div className="w-8 h-8 rounded-full bg-[#F67280]" title="Accent"></div>
                            <div className="w-8 h-8 rounded-full bg-[#F8B195]" title="Text"></div>
                        </div>
                    </button>

                    {/* Forest Theme Option */}
                    <button
                        onClick={() => setTheme("forest")}
                        className={`relative group rounded-xl p-4 border-2 transition-all duration-200 text-left ${theme === "forest"
                                ? "border-[#45ADA8] bg-[#594F4F]"
                                : "border-transparent bg-[#594F4F]/50 hover:bg-[#594F4F]"
                            }`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="font-bold text-lg" style={{ color: '#E5FCC2' }}>Forest</span>
                            {theme === "forest" && <Check className="w-5 h-5 text-[#45ADA8]" />}
                        </div>
                        <div className="flex gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#594F4F]" title="Background"></div>
                            <div className="w-8 h-8 rounded-full bg-[#45ADA8]" title="Primary"></div>
                            <div className="w-8 h-8 rounded-full bg-[#9DE0AD]" title="Accent"></div>
                            <div className="w-8 h-8 rounded-full bg-[#E5FCC2]" title="Text"></div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
