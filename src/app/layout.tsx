import {
  ClerkProvider,
  SignedIn,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import { Settings } from 'lucide-react';
import { Fraunces, Geist } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from "./contexts/theme-context";
import { auth } from "@clerk/nextjs/server";
import RoleNav from "@/components/RoleNav";
import { Permissions } from "@/lib/permissions";

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata = {
  title: 'HayFlow — Hay inventory & invoicing, made well',
  description: 'Modern inventory and invoicing for hay growers and dealers. Track bales, approve tickets, send invoices — from the barn or the office.',
  icons: { icon: '/brand/favicon.svg' },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let canManageTickets = false;
  let isDriver = false;
  try {
    const { has, userId } = await auth();
    if (userId) {
      canManageTickets = has({ permission: Permissions.TICKETS_MANAGE } as any);
      isDriver = has({ role: 'org:driver' } as any);
    }
  } catch {
    // Not authenticated — will use defaults
  }

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: 'var(--primary)',
          colorText: 'var(--text-main)',
          colorTextSecondary: 'var(--text-dim)',
          colorBackground: 'var(--bg-surface)',
          colorInputBackground: 'var(--bg-surface)',
          colorInputText: 'var(--text-main)',
          borderRadius: '0.75rem',
        },
      }}
    >
      <html lang="en" data-theme="harvest" className={`${fraunces.variable} ${geist.variable}`}>
        <body className="antialiased pb-24 transition-colors duration-300">
          <ThemeProvider>
            {/* Header */}
            <header className="sticky top-0 z-50 border-b bg-[var(--bg-deep)]/85 backdrop-blur-xl" style={{ borderColor: 'var(--glass-border)' }}>
              <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                <Link href="/" className="hover:opacity-85 transition-opacity">
                  <span className="wordmark text-2xl">
                    <span className="wordmark-hay">Hay</span>
                    <span className="wordmark-flow">Flow</span>
                  </span>
                </Link>
                <div className="flex items-center gap-4">
                  <SignedIn>
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
              <RoleNav isDriver={isDriver} canManageTickets={canManageTickets} />
            </SignedIn>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
