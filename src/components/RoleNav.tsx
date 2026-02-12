'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, MapPin, Box, BarChart3, Ticket, ClipboardList } from 'lucide-react';

interface RoleNavProps {
    canManageTickets: boolean;
}

export default function RoleNav({ canManageTickets }: RoleNavProps) {
    const pathname = usePathname();

    const navItems = [
        { href: '/', icon: <House size={20} />, label: 'Home' },
        { href: '/locations', icon: <MapPin size={20} />, label: 'Locations' },
        { href: '/stacks', icon: <Box size={20} />, label: 'Stacks' },
        { href: '/tickets', icon: <Ticket size={20} />, label: 'Tickets' },
        ...(canManageTickets ? [{ href: '/dispatch', icon: <ClipboardList size={20} />, label: 'Dispatch' }] : []),
        ...(!canManageTickets ? [{ href: '/reports', icon: <BarChart3 size={20} />, label: 'Reports' }] : []),
    ];

    // If bookkeeper/admin, add Reports too but we need to keep nav manageable
    // For now: Home, Locations, Stacks, Tickets, Dispatch (or Reports for drivers)

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-[var(--bg-deep)]/90 backdrop-blur-xl pb-safe" style={{ borderColor: 'var(--glass-border)' }}>
            <div className="flex justify-around items-center py-3">
                {navItems.map((item) => {
                    const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex flex-col items-center gap-1 transition-colors"
                            style={{
                                color: isActive ? 'var(--primary)' : 'var(--text-dim)',
                                opacity: isActive ? 1 : 0.7,
                            }}
                        >
                            <div className="w-5 h-5">{item.icon}</div>
                            <span className="text-[10px] uppercase font-bold tracking-wider">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
