'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, MapPin, Box, BarChart3, Ticket, Receipt } from 'lucide-react';

interface RoleNavProps {
    isDriver: boolean;
    canManageTickets: boolean;
}

export default function RoleNav({ isDriver, canManageTickets }: RoleNavProps) {
    const pathname = usePathname();

    // Drivers: only Locations, Stacks, Tickets
    // Admin/Bookkeeper: Home, Locations, Stacks, Tickets, Invoicing, Reports
    const navItems = isDriver
        ? [
            { href: '/locations', icon: <MapPin size={20} />, label: 'Locations', tour: 'nav-locations' },
            { href: '/stacks', icon: <Box size={20} />, label: 'Stacks', tour: 'nav-stacks' },
            { href: '/tickets', icon: <Ticket size={20} />, label: 'Tickets', tour: 'nav-tickets' },
        ]
        : [
            { href: '/', icon: <House size={20} />, label: 'Home', tour: 'nav-home' },
            { href: '/locations', icon: <MapPin size={20} />, label: 'Locations', tour: 'nav-locations' },
            { href: '/stacks', icon: <Box size={20} />, label: 'Stacks', tour: 'nav-stacks' },
            // Tickets + Invoicing collapse into one "Sales" hub: managers land on
            // the dispatch/invoicing queue, others on the ticket list. Both paths
            // light up the same tab.
            {
                href: canManageTickets ? '/dispatch' : '/tickets',
                icon: <Receipt size={20} />,
                label: 'Sales',
                match: ['/dispatch', '/tickets'],
                tour: 'nav-sales',
            },
            { href: '/reports', icon: <BarChart3 size={20} />, label: 'Reports', tour: 'nav-reports' },
        ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-[var(--bg-deep)]/90 backdrop-blur-xl pb-safe" style={{ borderColor: 'var(--glass-border)' }}>
            <div className="flex justify-around items-center py-3">
                {navItems.map((item) => {
                    const matches: string[] = (item as any).match || [item.href];
                    const isActive = item.href === '/'
                        ? pathname === '/'
                        : matches.some((m) => pathname.startsWith(m));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            data-tour={item.tour}
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

