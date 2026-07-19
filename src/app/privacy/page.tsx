import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell, LegalSection, LegalList } from "@/components/LegalPage";

// Public route (not in middleware's protected list). Source of record:
// docs/legal/privacy-policy.md — keep both in sync when editing.

export const metadata: Metadata = {
    title: "Privacy Policy — HayFlow",
    description: "Privacy Policy for HayFlow, the hay inventory and invoicing app by Dune Summit LLC.",
};

const SUBPROCESSORS: [string, string][] = [
    ["Clerk", "Authentication, organization management, billing"],
    ["Stripe", "Payment processing"],
    ["Neon", "Database hosting (where Customer Data is stored)"],
    ["Vercel", "Application hosting"],
    ["Anthropic", "AI help assistant (processes support questions you submit)"],
    ["Upstash", "Rate limiting / abuse prevention"],
    ["Sentry", "Error and performance monitoring"],
    ["Email provider (when configured)", "Transactional and support email"],
];

export default function PrivacyPage() {
    return (
        <LegalShell title="Privacy Policy" effectiveDate="July 18, 2026">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>
                This Privacy Policy explains what information HayFlow collects, how we use it, and the choices you have.
                It supplements the <Link href="/terms" className="underline">Terms of Service</Link>. HayFlow is operated
                by <strong>Dune Summit LLC</strong> (&quot;Dune Summit,&quot; &quot;we,&quot; &quot;us&quot;).
            </p>

            <LegalSection heading="1. Who controls your data">
                <p>
                    For the business data you enter into HayFlow (&quot;<strong>Customer Data</strong>&quot;),{' '}
                    <strong>you (the customer organization) are the controller</strong> and Dune Summit acts as a{' '}
                    <strong>processor/service provider</strong> that handles it on your behalf to run the Service. For
                    account and billing information, we act as a controller.
                </p>
            </LegalSection>

            <LegalSection heading="2. Information we collect">
                <LegalList items={[
                    <><strong>Account &amp; identity</strong> (via Clerk): name, email, organization name, role, and authentication metadata.</>,
                    <><strong>Billing</strong> (via Clerk Billing / Stripe): subscription plan, trial status, and payment metadata. <strong>We do not store full payment card numbers</strong> — Stripe handles card data.</>,
                    <><strong>Customer Data you enter:</strong> locations, stacks, inventory transactions, tickets, invoices, business profile, and any customer/contact details you choose to add (e.g., the name of a buyer on an invoice).</>,
                    <><strong>Support &amp; AI assistant:</strong> messages you send to the in-app help assistant or support, which may be processed by our AI vendor (Anthropic) and stored to provide and improve support.</>,
                    <><strong>Technical &amp; usage data:</strong> IP address, device/browser info, log and error data (via Sentry), and rate-limiting signals on public endpoints (via Upstash). Used for security, debugging, and reliability.</>,
                ]} />
            </LegalSection>

            <LegalSection heading="3. How we use information">
                <LegalList items={[
                    <>To <strong>provide, operate, secure, and support</strong> the Service.</>,
                    <>To <strong>process billing</strong> and manage subscriptions and trials.</>,
                    <>To <strong>monitor reliability</strong> (error tracking, uptime, rate limiting) and prevent abuse.</>,
                    <>To <strong>communicate</strong> with you about your account, service changes, and support.</>,
                    <>To <strong>comply with law</strong> and enforce our Terms.</>,
                ]} />
                <p>
                    We do <strong>not</strong> sell your personal information or Customer Data. We do <strong>not</strong>{' '}
                    use your Customer Data for advertising.
                </p>
            </LegalSection>

            <LegalSection heading="4. Conflict of interest — important data-use limits">
                <p>
                    The owner of Dune Summit LLC is also employed by a company in the hay export industry. Because some
                    HayFlow customers may operate in that same industry, we make these binding commitments (see also
                    Section 5 of the <Link href="/terms" className="underline">Terms</Link>):
                </p>
                <LegalList items={[
                    <>We will <strong>not</strong> access, analyze, or use your Customer Data for the benefit of any hay export company or for any competitive, sourcing, pricing, or trading purpose.</>,
                    <>We will <strong>not</strong> share or disclose your Customer Data — or insights derived from it — with the owner&apos;s employer or its affiliates.</>,
                    <>Internal access to Customer Data is limited to operating, securing, and supporting the Service, and is not used to inform the owner&apos;s separate employment.</>,
                    <>Your data is kept logically isolated per organization and is not commingled with any other business&apos;s operations.</>,
                ]} />
                <p>
                    If our ownership changes or these commitments can no longer be honored, we will notify affected
                    customers (Section 8).
                </p>
            </LegalSection>

            <LegalSection heading="5. How we share information (subprocessors)">
                <p>
                    We share information only with vendors that help us run the Service, under contracts that restrict
                    their use of it:
                </p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm" style={{ color: 'var(--text-main)' }}>
                        <thead>
                            <tr className="text-left" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                <th className="py-2 pr-4 font-bold">Vendor</th>
                                <th className="py-2 font-bold">Purpose</th>
                            </tr>
                        </thead>
                        <tbody>
                            {SUBPROCESSORS.map(([vendor, purpose]) => (
                                <tr key={vendor} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                    <td className="py-2 pr-4 align-top whitespace-nowrap">{vendor}</td>
                                    <td className="py-2">{purpose}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p>
                    We may also disclose information <strong>to comply with law</strong>, respond to lawful requests,
                    protect rights and safety, or in connection with a <strong>business transfer</strong> (merger,
                    acquisition, or sale of assets) — in which case we will notify you and the data-use commitments in
                    Section 4 will be addressed.
                </p>
            </LegalSection>

            <LegalSection heading="6. Data location, security, and retention">
                <LegalList items={[
                    <>Customer Data is stored in our hosted Postgres database (Neon) and processed in the United States (AWS us-west-2 region).</>,
                    <>We use multi-tenant isolation (every record is scoped to your organization), encrypted connections, scoped access, and access controls. No system is perfectly secure.</>,
                    <>We retain Customer Data while your account is active. After termination, you may request an export for <strong>30 days</strong>, after which we may delete or anonymize it, subject to legal retention requirements and routine backups.</>,
                ]} />
            </LegalSection>

            <LegalSection heading="7. Your choices and rights">
                <LegalList items={[
                    <><strong>Access / export / correct / delete:</strong> Organization admins can view and edit Customer Data in-app, and may request export or deletion by contacting us.</>,
                    <>Depending on where you live, you may have rights under laws such as the <strong>CCPA/CPRA</strong> or others. To exercise rights, contact <a href="mailto:support@hayflow.io" className="underline">support@hayflow.io</a>. We will not discriminate against you for exercising them.</>,
                    <>For Customer Data, individuals whose information you entered should direct requests to you (the controller); we will assist you as required.</>,
                ]} />
            </LegalSection>

            <LegalSection heading="8. Changes and notice">
                <p>
                    We may update this Policy. We will post the updated version with a new effective date and, for material
                    changes, provide reasonable notice. We will notify affected customers of incidents or changes affecting
                    the Section 4 commitments as required by law.
                </p>
            </LegalSection>

            <LegalSection heading="9. Children">
                <p>
                    HayFlow is a business tool and is <strong>not directed to children under 16</strong>. We do not
                    knowingly collect their personal information.
                </p>
            </LegalSection>

            <LegalSection heading="10. Contact">
                <p>
                    Privacy questions or requests: <a href="mailto:support@hayflow.io" className="underline">support@hayflow.io</a>,
                    Dune Summit LLC. Mailing address available on request.
                </p>
            </LegalSection>
        </LegalShell>
    );
}
