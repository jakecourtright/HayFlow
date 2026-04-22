import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CreateOrganization } from "@clerk/nextjs";
import { Sparkles } from "lucide-react";

export default async function WelcomePage() {
    const { userId, orgId } = await auth();
    if (!userId) redirect("/sign-in");
    if (orgId) redirect("/");

    return (
        <div className="py-6 space-y-8">
            <div className="text-center space-y-3">
                <div
                    className="inline-flex items-center justify-center w-12 h-12 rounded-2xl"
                    style={{
                        background: 'color-mix(in srgb, var(--primary) 14%, transparent)',
                        color: 'var(--primary)',
                    }}
                >
                    <Sparkles size={22} />
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-bold leading-tight" style={{ color: 'var(--accent)' }}>
                    Welcome to HayFlow.
                </h1>
                <p className="text-base max-w-md mx-auto" style={{ color: 'var(--text-dim)' }}>
                    First things first — name your business. This is the workspace your team, stacks, and invoices live inside.
                </p>
            </div>

            <div className="glass-card flex justify-center">
                <CreateOrganization
                    skipInvitationScreen
                    hideSlug
                    afterCreateOrganizationUrl="/billing"
                    appearance={{
                        elements: {
                            rootBox: "w-full",
                            cardBox: "shadow-none bg-transparent",
                            card: "shadow-none bg-transparent p-0",
                        },
                    }}
                />
            </div>

            <p className="text-center text-xs" style={{ color: 'var(--text-dim)' }}>
                You can invite drivers and bookkeepers later from Settings.
            </p>
        </div>
    );
}
