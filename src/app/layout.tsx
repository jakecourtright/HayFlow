import Link from "next/link";
import { House, Box, ClipboardList, MapPin, BarChart3, Settings } from 'lucide-react';
import './globals.css';
import { ThemeProvider } from "./contexts/theme-context";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased pb-24 transition-colors duration-300">
        <ThemeProvider>
          {/* Header */}
          <header className="sticky top-0 z-50 border-b bg-[var(--bg-deep)]/80 backdrop-blur-xl" style={{ borderColor: 'var(--glass-border)' }}>
            <div className="container mx-auto px-6 py-4">
              <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--accent)' }}>
                HayStock
              </h1>
            </div>
          </header>

          {/* Main Content */}
          <main className="container mx-auto px-6 py-6 max-w-2xl">
            {children}
          </main>

          {/* Bottom Navigation */}
          <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-[var(--bg-deep)]/90 backdrop-blur-xl pb-safe" style={{ borderColor: 'var(--glass-border)' }}>
            <div className="flex justify-around items-center py-3">
              <NavLink href="/" icon={<House size={20} />} label="Home" />
              <NavLink href="/locations" icon={<MapPin size={20} />} label="Locations" />
              <NavLink href="/stacks" icon={<Box size={20} />} label="Stacks" />
              <NavLink href="/log" icon={<ClipboardList size={20} />} label="Log" />
              <NavLink href="/reports" icon={<BarChart3 size={20} />} label="Reports" />
              <NavLink href="/settings" icon={<Settings size={20} />} label="Settings" />
            </div>
          </nav>
        </ThemeProvider>
      </body>
    </html>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1 transition-colors hover:opacity-100 opacity-70" style={{ color: 'var(--text-dim)' }}>
      <div className="w-5 h-5">{icon}</div>
      <span className="text-[10px] uppercase font-bold tracking-wider">{label}</span>
    </Link>
  );
}
