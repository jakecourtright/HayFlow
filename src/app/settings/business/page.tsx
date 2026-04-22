import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Permissions } from "@/lib/permissions";
import { getBusinessProfile, saveBusinessProfile } from "@/app/actions";
import PageHeader from "@/components/ui/PageHeader";
import SubmitButton from "@/components/ui/SubmitButton";
import { Save } from "lucide-react";

export default async function BusinessSettingsPage() {
    const { userId, orgId, has } = await auth();
    if (!userId || !orgId) redirect("/sign-in");
    if (!has({ permission: Permissions.INVOICES_MANAGE } as any)) redirect("/settings");

    const profile = await getBusinessProfile();

    return (
        <div>
            <PageHeader
                eyebrow="Settings"
                title="Business profile"
                subtitle="Shown as the “From” block on every invoice you share or print."
                backHref="/settings"
                backLabel="Settings"
            />

            <form action={saveBusinessProfile} className="glass-card space-y-5">
                <div>
                    <label className="label-modern" htmlFor="name">Business name</label>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        className="input-modern"
                        placeholder="Courtright Hay Co."
                        defaultValue={profile?.name ?? ''}
                    />
                </div>

                <div>
                    <label className="label-modern" htmlFor="address_line1">Street address</label>
                    <input
                        id="address_line1"
                        name="address_line1"
                        type="text"
                        className="input-modern"
                        placeholder="1234 County Road 45"
                        defaultValue={profile?.address_line1 ?? ''}
                    />
                </div>

                <div>
                    <label className="label-modern" htmlFor="address_line2">Address line 2 (optional)</label>
                    <input
                        id="address_line2"
                        name="address_line2"
                        type="text"
                        className="input-modern"
                        placeholder="Suite, PO Box, etc."
                        defaultValue={profile?.address_line2 ?? ''}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                        <label className="label-modern" htmlFor="city">City</label>
                        <input
                            id="city"
                            name="city"
                            type="text"
                            className="input-modern"
                            defaultValue={profile?.city ?? ''}
                        />
                    </div>
                    <div>
                        <label className="label-modern" htmlFor="state">State</label>
                        <input
                            id="state"
                            name="state"
                            type="text"
                            className="input-modern"
                            defaultValue={profile?.state ?? ''}
                        />
                    </div>
                    <div>
                        <label className="label-modern" htmlFor="zip">ZIP</label>
                        <input
                            id="zip"
                            name="zip"
                            type="text"
                            className="input-modern"
                            defaultValue={profile?.zip ?? ''}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="label-modern" htmlFor="phone">Phone</label>
                        <input
                            id="phone"
                            name="phone"
                            type="tel"
                            className="input-modern"
                            placeholder="(555) 555-0123"
                            defaultValue={profile?.phone ?? ''}
                        />
                    </div>
                    <div>
                        <label className="label-modern" htmlFor="email">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            className="input-modern"
                            placeholder="you@farm.com"
                            defaultValue={profile?.email ?? ''}
                        />
                    </div>
                </div>

                <div>
                    <label className="label-modern" htmlFor="payment_instructions">Payment instructions</label>
                    <textarea
                        id="payment_instructions"
                        name="payment_instructions"
                        rows={4}
                        className="input-modern"
                        placeholder="Make checks payable to Courtright Hay Co.&#10;Venmo: @courtright-hay&#10;Due on receipt."
                        defaultValue={profile?.payment_instructions ?? ''}
                    />
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-dim)' }}>
                        Appears at the bottom of shared and printed invoices.
                    </p>
                </div>

                <SubmitButton pendingLabel="Saving…">
                    <Save size={16} />
                    Save business profile
                </SubmitButton>
            </form>
        </div>
    );
}
