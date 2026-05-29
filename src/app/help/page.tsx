import { getPermissionFlags } from "@/lib/permissions";
import { getArticlesForRole } from "@/lib/help-content";
import PageHeader from "@/components/ui/PageHeader";
import HelpCenterClient from "./HelpCenterClient";

export const metadata = {
    title: "Help Center — HayFlow",
    description: "Guides and answers for HayFlow.",
};

export default async function HelpPage() {
    // Auth is enforced by middleware. Flags tailor which articles show:
    // office (admins/bookkeepers) and drivers see different sets.
    const flags = await getPermissionFlags();
    const articles = getArticlesForRole({
        isOffice: flags.canManageInvoices,
        isDriver: flags.isDriver,
    });

    return (
        <div>
            <PageHeader
                eyebrow="Help"
                title="Help Center"
                subtitle="Guides and answers for getting the most out of HayFlow."
            />
            <HelpCenterClient articles={articles} />
        </div>
    );
}
