import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { OrganizationProfile } from "@clerk/nextjs";
import PageHeader from "@/components/ui/PageHeader";

// Full Clerk organization profile — the Billing tab is where org admins manage
// payment methods, view statements, and cancel the subscription. Clerk owns
// subscription state (Stripe is only the processor), so cards MUST be changed
// here rather than in the Stripe dashboard: Clerk charges the payment method
// it has on record and never re-reads cards added Stripe-side.
export default async function OrganizationSettingsPage() {
    const { userId, orgId } = await auth();
    if (!userId) redirect("/sign-in");
    if (!orgId) redirect("/welcome");

    return (
        <div>
            <PageHeader
                eyebrow="Settings"
                title="Organization"
                subtitle="Members, billing, payment methods, and invoices."
                backHref="/settings"
                backLabel="Settings"
            />
            <div className="flex justify-center">
                <OrganizationProfile
                    routing="path"
                    path="/settings/organization"
                    appearance={{
                        elements: {
                            rootBox: "w-full",
                            cardBox: "w-full max-w-none shadow-none",
                        },
                    }}
                />
            </div>
        </div>
    );
}
