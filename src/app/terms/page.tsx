import type { Metadata } from "next";
import { LegalShell, LegalSection, LegalList } from "@/components/LegalPage";

// Public route (not in middleware's protected list). Source of record:
// docs/legal/terms-of-service.md — keep both in sync when editing.

export const metadata: Metadata = {
    title: "Terms of Service — HayFlow",
    description: "Terms of Service for HayFlow, the hay inventory and invoicing app by Dune Summit LLC.",
};

export default function TermsPage() {
    return (
        <LegalShell title="Terms of Service" effectiveDate="July 18, 2026">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>
                HayFlow is operated by <strong>Dune Summit LLC</strong> (&quot;Dune Summit,&quot; &quot;we,&quot; &quot;us,&quot; &quot;our&quot;).
                By creating an account, accessing, or using HayFlow (the &quot;Service&quot;), you (&quot;Customer,&quot; &quot;you&quot;)
                agree to these Terms of Service (&quot;Terms&quot;). If you are agreeing on behalf of a business, you represent
                that you are authorized to bind that business.
            </p>

            <LegalSection heading="1. The Service">
                <p>
                    HayFlow lets you track hay inventory (locations, stacks, transactions), record and approve driver
                    tickets, generate invoices, and share those invoices with your customers via a link. We may add,
                    change, or remove features over time.
                </p>
            </LegalSection>

            <LegalSection heading="2. Accounts, organizations, and roles">
                <LegalList items={[
                    <>You access HayFlow through an <strong>organization</strong> (your business workspace). You are responsible for all activity within your organization.</>,
                    <>You control who you invite and what role (admin, bookkeeper, driver) they hold. You are responsible for managing those roles and for your team&apos;s use of the Service.</>,
                    <>You must provide accurate account information and keep your credentials secure. Authentication is provided through our identity vendor (Clerk).</>,
                ]} />
            </LegalSection>

            <LegalSection heading="3. Subscriptions, trials, and billing">
                <LegalList items={[
                    <>HayFlow is offered on paid subscription plans (currently <strong>Pro — $25/month</strong> and <strong>Team — $100/month</strong>), subject to change with notice.</>,
                    <>New organizations may receive a <strong>14-day free trial</strong>. Unless you cancel before the trial ends, your subscription converts to a paid plan and your payment method is charged automatically.</>,
                    <>Billing and payment processing are handled by our vendors (Clerk Billing and Stripe). By subscribing you also agree to Stripe&apos;s applicable terms.</>,
                    <>Fees are billed in advance and are <strong>non-refundable except where required by law</strong>. You can cancel anytime; cancellation stops future renewals and your access continues until the end of the paid period.</>,
                    <>If payment fails or a subscription lapses, your organization may move to <strong>read-only mode</strong> until billing is restored.</>,
                    <>We may change pricing on prospective renewals with at least <strong>30 days&apos;</strong> notice.</>,
                ]} />
            </LegalSection>

            <LegalSection heading="4. Customer Data and ownership">
                <LegalList items={[
                    <>&quot;<strong>Customer Data</strong>&quot; means all data you or your team enter into or generate through HayFlow — including inventory, locations, stacks, transactions, tickets, invoices, customer/contact details, and business profile information.</>,
                    <><strong>You own your Customer Data.</strong> We claim no ownership of it.</>,
                    <>You grant Dune Summit a limited license to host, process, transmit, display, and back up Customer Data <strong>solely to operate and support the Service for you</strong>, and as described in the Privacy Policy.</>,
                    <>You are responsible for the accuracy and legality of your Customer Data and for having the rights to share any third-party information (e.g., your customers&apos; contact details) that you enter.</>,
                ]} />
            </LegalSection>

            <LegalSection heading="5. Conflict of Interest and Data-Use Commitment">
                <p>
                    <strong>Disclosure.</strong> You should know, plainly: the owner of Dune Summit LLC is also employed
                    by a company that operates in the hay export business. Some HayFlow customers may be growers, dealers,
                    or brokers who operate in the same industry, and could be considered competitors of, suppliers to, or
                    customers of that employer. We are disclosing this potential conflict of interest up front, in the
                    interest of transparency.
                </p>
                <p><strong>Our binding commitments.</strong> To address this conflict, Dune Summit commits that:</p>
                <LegalList items={[
                    <><strong>No competitive use.</strong> We will not access, view, use, analyze, aggregate, or derive insights from your Customer Data for the benefit of any hay export company, for any competitive purpose, or for sourcing, pricing, customer-targeting, or trading decisions of any business other than yours.</>,
                    <><strong>No sharing with the employer.</strong> We will not disclose, sell, transfer, or otherwise make your Customer Data — or any analysis of it — available to the owner&apos;s employer or any of its affiliates.</>,
                    <><strong>Limited internal access.</strong> Dune Summit personnel will not access the contents of your Customer Data except (a) with your authorization, to provide support you request; (b) as strictly necessary to operate, secure, or troubleshoot the Service; or (c) where required by law. Such access is limited to the minimum needed and is logged where feasible.</>,
                    <><strong>No commingling.</strong> Your Customer Data is kept logically separated by organization (multi-tenant isolation) and is not commingled with, or used to inform, the operations of the owner&apos;s employer.</>,
                    <><strong>The owner&apos;s separate role.</strong> The owner&apos;s duties at their employer are kept separate from the operation of HayFlow. HayFlow Customer Data is not used in, and does not flow into, that role.</>,
                ]} />
                <p>
                    These commitments survive termination of your account with respect to any Customer Data we still hold.
                    If we ever cannot honor them (for example, due to a change in ownership or a legal order), we will
                    notify affected customers as described in the Privacy Policy. Nothing in this section waives any rights
                    you may have under applicable law.
                </p>
            </LegalSection>

            <LegalSection heading="6. Acceptable use">
                <p>
                    You agree not to: (a) use the Service to violate any law; (b) attempt to access another
                    organization&apos;s data or breach security or rate limits (including the public invoice-sharing
                    endpoint); (c) reverse engineer, scrape, or overload the Service; (d) upload malware or infringing
                    content; or (e) resell or provide the Service to third parties except your own authorized team members.
                </p>
            </LegalSection>

            <LegalSection heading="7. Public invoice links">
                <p>
                    Invoices can be shared via a link secured by an unguessable token. Anyone with the link can view that
                    invoice. You are responsible for sharing links only with intended recipients. We apply rate limiting
                    and other safeguards but are not responsible for links you distribute.
                </p>
            </LegalSection>

            <LegalSection heading="8. Third-party services">
                <p>
                    The Service relies on third-party providers, including <strong>Clerk</strong> (authentication, billing),{' '}
                    <strong>Stripe</strong> (payments), <strong>Neon</strong> (database hosting), <strong>Vercel</strong>{' '}
                    (application hosting), and may use <strong>Anthropic</strong> (AI help assistant), <strong>Upstash</strong>{' '}
                    (rate limiting), <strong>Sentry</strong> (error monitoring), and an email provider. Your use may be
                    subject to their terms, and their availability affects ours.
                </p>
            </LegalSection>

            <LegalSection heading="9. AI help assistant">
                <p>
                    HayFlow may include an AI assistant to answer product questions. AI responses can be inaccurate or
                    incomplete and are provided for convenience only — they are <strong>not</strong> professional, legal,
                    accounting, or tax advice. Verify anything important.
                </p>
            </LegalSection>

            <LegalSection heading="10. Service availability; no warranty">
                <p>
                    We aim for high availability but do not guarantee uninterrupted or error-free service.{' '}
                    <strong>The Service is provided &quot;AS IS&quot; and &quot;AS AVAILABLE,&quot; without warranties of
                    any kind</strong>, express or implied, including merchantability, fitness for a particular purpose, and
                    non-infringement, to the maximum extent permitted by law.
                </p>
            </LegalSection>

            <LegalSection heading="11. Limitation of liability">
                <p>
                    To the maximum extent permitted by law, Dune Summit will not be liable for any indirect, incidental,
                    special, consequential, or punitive damages, or for lost profits, revenues, data, or goodwill. Our
                    total aggregate liability for any claim arising out of or relating to the Service will not exceed
                    the <strong>greater of (a) the amounts you paid us in the 12 months before the claim, or (b) $100</strong>.
                    Some jurisdictions do not allow these limits, so they may not fully apply to you.
                </p>
            </LegalSection>

            <LegalSection heading="12. Indemnification">
                <p>
                    You agree to indemnify and hold harmless Dune Summit from claims arising out of your Customer Data,
                    your use of the Service, or your violation of these Terms, except to the extent caused by our breach
                    of Section 5.
                </p>
            </LegalSection>

            <LegalSection heading="13. Termination">
                <p>
                    You may stop using and cancel the Service at any time. We may suspend or terminate your access for
                    material breach of these Terms, non-payment, or to comply with law. On termination, you may request an
                    export of your Customer Data for <strong>30 days</strong>, after which we may delete it per our
                    retention practices.
                </p>
            </LegalSection>

            <LegalSection heading="14. Changes to these Terms">
                <p>
                    We may update these Terms. We will post the updated version with a new effective date and, for material
                    changes, provide reasonable notice. Continued use after changes take effect constitutes acceptance.
                </p>
            </LegalSection>

            <LegalSection heading="15. Governing law; disputes">
                <p>
                    These Terms are governed by the laws of the State of <strong>Washington</strong>, without regard to
                    conflict-of-laws rules. Any dispute arising out of or relating to these Terms or the Service will be
                    resolved exclusively in the state or federal courts located in Washington, and both parties consent to
                    their jurisdiction and venue.
                </p>
            </LegalSection>

            <LegalSection heading="16. Contact">
                <p>
                    Questions about these Terms: <a href="mailto:support@hayflow.io" className="underline">support@hayflow.io</a>,
                    Dune Summit LLC. Mailing address available on request.
                </p>
            </LegalSection>
        </LegalShell>
    );
}
