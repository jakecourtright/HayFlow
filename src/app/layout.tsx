import {
  ClerkProvider,
  OrganizationSwitcher,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import { Settings } from 'lucide-react';
import { Fraunces, Geist } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from "./contexts/theme-context";
import { auth } from "@clerk/nextjs/server";
import RoleNav from "@/components/RoleNav";
import TrialBanner from "@/components/TrialBanner";
import { getPermissionFlags } from "@/lib/permissions";
import { ToastProvider } from "@/components/ui/Toast";
import HelpLauncher from "@/components/help/HelpLauncher";
import TourGuide from "@/components/help/TourGuide";
import { getArticlesForRole } from "@/lib/help-content";
import { getCompletedTours } from "@/app/actions";

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
  let canManageInvoices = false;
  let isDriver = false;
  let isSignedIn = false;
  try {
    const { userId } = await auth();
    if (userId) {
      isSignedIn = true;
      const flags = await getPermissionFlags();
      canManageTickets = flags.canManageTickets;
      canManageInvoices = flags.canManageInvoices;
      isDriver = flags.isDriver;
    }
  } catch {
    // Not authenticated — will use defaults
  }

  // Role-tailored help articles for the floating assistant (signed-in only).
  const helpArticles = isSignedIn
    ? getArticlesForRole({ isOffice: canManageInvoices, isDriver })
    : [];

  // Which guided tours has this user already finished? (signed-in only)
  const completedTours = isSignedIn ? await getCompletedTours() : [];

  return (
    <html lang="en" data-theme="harvest" className={`${fraunces.variable} ${geist.variable}`}>
      <body className="antialiased pb-24 transition-colors duration-300"><ClerkProvider
          appearance={{
            variables: {
              colorPrimary: 'var(--primary)',
              colorForeground: 'var(--text-main)',
              colorMutedForeground: 'var(--text-dim)',
              colorBackground: 'var(--bg-surface)',
              colorInput: 'var(--bg-surface)',
              colorInputForeground: 'var(--text-main)',
              borderRadius: '0.75rem',
            },
          }}>
          <ThemeProvider>
            <ToastProvider>
              {/* Header */}
              <header className="sticky top-0 z-50 border-b bg-[var(--bg-deep)]/85 backdrop-blur-xl" style={{ borderColor: 'var(--glass-border)' }}>
                <div className="container mx-auto px-6 py-4 flex justify-between items-center max-w-3xl">
                  <Link href="/" className="hover:opacity-85 transition-opacity">
                    <span className="wordmark text-2xl">
                      <span className="wordmark-hay">Hay</span>
                      <span className="wordmark-flow">Flow</span>
                    </span>
                  </Link>
                  <div className="flex items-center gap-2 sm:gap-3">
                    {isSignedIn && (
                      <>
                        <div className="hidden sm:block">
                          <OrganizationSwitcher
                            hidePersonal
                            appearance={{
                              elements: {
                                organizationSwitcherTrigger:
                                  "rounded-lg px-2 py-1.5 gap-2 hover:bg-[var(--bg-surface)] transition-colors",
                              },
                            }}
                          />
                        </div>
                        <Link
                          href="/settings"
                          aria-label="Settings"
                          className="icon-button"
                        >
                          <Settings size={18} />
                        </Link>
                        <UserButton
                          appearance={{
                            elements: {
                              avatarBox: "w-9 h-9 border-2 border-[var(--primary)]"
                            }
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>
              </header>

              {isSignedIn && <TrialBanner />}

              {/* Main Content */}
              <main className="container mx-auto px-6 py-6 max-w-2xl">
                {children}
              </main>

              {/* Bottom Navigation */}
              {isSignedIn && (
                <RoleNav isDriver={isDriver} canManageTickets={canManageTickets} />
              )}

              {/* Floating help & support assistant */}
              {isSignedIn && <HelpLauncher articles={helpArticles} />}

              {/* Guided coachmark tours (auto-starts the role tour once) */}
              {isSignedIn && (
                <TourGuide completedTours={completedTours} isDriver={isDriver} isOffice={canManageInvoices} />
              )}
            </ToastProvider>
          </ThemeProvider>
        </ClerkProvider></body>
    </html>
  );
}
