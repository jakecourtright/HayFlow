import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  OrganizationSwitcher,
  UserButton,
} from "@clerk/nextjs";
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
    <ClerkProvider>
      <html lang="en">
        <body className="antialiased pb-24 transition-colors duration-300">
          <ThemeProvider>
            {/* Header */}
            <header className="sticky top-0 z-50 border-b bg-[var(--bg-deep)]/80 backdrop-blur-xl" style={{ borderColor: 'var(--glass-border)' }}>
              <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                <Link href="/" className="hover:opacity-80 transition-opacity">
                  <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--accent)' }}>
                    HayFlow
                  </h1>
                </Link>
                <div className="flex items-center gap-4">
                  <SignedIn>
                    <OrganizationSwitcher
                      appearance={{
                        elements: {
                          organizationSwitcherTrigger: "py-2 px-3 rounded-xl hover:bg-[var(--bg-surface)] text-[var(--text-main)]",
                        }
                      }}
                    />
                    <UserButton
                      appearance={{
                        elements: {
                          avatarBox: "w-9 h-9 border-2 border-[var(--primary)]"
                        }
                      }}
                    />
                    <Link href="/settings" className="p-2 rounded-xl hover:bg-[var(--bg-surface)] transition-colors">
                      <Settings size={20} style={{ color: 'var(--text-dim)' }} />
                    </Link>
                  </SignedIn>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-6 py-6 max-w-2xl">
              {children}
            </main>

            {/* Bottom Navigation */}
            <SignedIn>
              <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-[var(--bg-deep)]/90 backdrop-blur-xl pb-safe" style={{ borderColor: 'var(--glass-border)' }}>
                <div className="flex justify-around items-center py-3">
                  <NavLink href="/" icon={<House size={20} />} label="Home" />
                  <NavLink href="/locations" icon={<MapPin size={20} />} label="Locations" />
                  <NavLink href="/stacks" icon={<Box size={20} />} label="Stacks" />
                  <NavLink href="/reports" icon={<BarChart3 size={20} />} label="Reports" />
                </div>
              </nav>
            </SignedIn>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
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
