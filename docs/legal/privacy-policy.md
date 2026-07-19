# HayFlow — Privacy Policy

> **DRAFT — NOT LEGAL ADVICE.** Starting point only; not reviewed by an attorney. Have counsel review before publishing, and confirm whether state laws (e.g., CCPA/CPRA) or sector rules apply to you. Replace every **[BRACKETED]** placeholder.

**Operator:** Dune Summit LLC ("Dune Summit," "we," "us")
**Service:** HayFlow (the "Service")
**Effective date:** July 18, 2026
**Contact:** support@hayflow.io · Dune Summit LLC

This Privacy Policy explains what information HayFlow collects, how we use it, and the choices you have. It supplements the [Terms of Service](./terms-of-service.md).

---

## 1. Who controls your data

For the business data you enter into HayFlow ("**Customer Data**"), **you (the customer organization) are the controller** and Dune Summit acts as a **processor/service provider** that handles it on your behalf to run the Service. For account and billing information, we act as a controller.

## 2. Information we collect

**a. Account & identity** (via Clerk): name, email, organization name, role, and authentication metadata.

**b. Billing** (via Clerk Billing / Stripe): subscription plan, trial status, and payment metadata. **We do not store full payment card numbers** — Stripe handles card data.

**c. Customer Data you enter:** locations, stacks, inventory transactions, tickets, invoices, business profile, and any customer/contact details you choose to add (e.g., the name of a buyer on an invoice).

**d. Support & AI assistant:** messages you send to the in-app help assistant or support, which may be processed by our AI vendor (Anthropic) and stored to provide and improve support.

**e. Technical & usage data:** IP address, device/browser info, log and error data (via Sentry), and rate-limiting signals on public endpoints (via Upstash). Used for security, debugging, and reliability.

## 3. How we use information

- To **provide, operate, secure, and support** the Service.
- To **process billing** and manage subscriptions and trials.
- To **monitor reliability** (error tracking, uptime, rate limiting) and prevent abuse.
- To **communicate** with you about your account, service changes, and support.
- To **comply with law** and enforce our Terms.

We do **not** sell your personal information or Customer Data. We do **not** use your Customer Data for advertising.

## 4. Conflict of interest — important data-use limits

The owner of Dune Summit LLC is also employed by a company in the hay export industry. Because some HayFlow customers may operate in that same industry, we make these binding commitments (see also Section 5 of the Terms):

- We will **not** access, analyze, or use your Customer Data for the benefit of any hay export company or for any competitive, sourcing, pricing, or trading purpose.
- We will **not** share or disclose your Customer Data — or insights derived from it — with the owner's employer or its affiliates.
- Internal access to Customer Data is limited to operating, securing, and supporting the Service, and is not used to inform the owner's separate employment.
- Your data is kept logically isolated per organization and is not commingled with any other business's operations.

If our ownership changes or these commitments can no longer be honored, we will notify affected customers (Section 8).

## 5. How we share information (subprocessors)

We share information only with vendors that help us run the Service, under contracts that restrict their use of it:

| Vendor | Purpose |
|--------|---------|
| Clerk | Authentication, organization management, billing |
| Stripe | Payment processing |
| Neon | Database hosting (where Customer Data is stored) |
| Vercel | Application hosting |
| Anthropic | AI help assistant (processes support questions you submit) |
| Upstash | Rate limiting / abuse prevention |
| Sentry | Error and performance monitoring |
| Email provider (when configured) | Transactional and support email |

We may also disclose information **to comply with law**, respond to lawful requests, protect rights and safety, or in connection with a **business transfer** (merger, acquisition, or sale of assets) — in which case we will notify you and the data-use commitments in Section 4 will be addressed.

## 6. Data location, security, and retention

- Customer Data is stored in our hosted Postgres database (Neon) and processed in the United States (AWS us-west-2 region).
- We use multi-tenant isolation (every record is scoped to your organization), encrypted connections, scoped access, and access controls. No system is perfectly secure.
- We retain Customer Data while your account is active. After termination, you may request an export for **30 days**, after which we may delete or anonymize it, subject to legal retention requirements and routine backups.

## 7. Your choices and rights

- **Access / export / correct / delete:** Organization admins can view and edit Customer Data in-app, and may request export or deletion by contacting us.
- Depending on where you live, you may have rights under laws such as the **CCPA/CPRA** or others. To exercise rights, contact **support@hayflow.io**. We will not discriminate against you for exercising them.
- For Customer Data, individuals whose information you entered should direct requests to you (the controller); we will assist you as required.

## 8. Changes and notice

We may update this Policy. We will post the updated version with a new effective date and, for material changes, provide reasonable notice. We will notify affected customers of incidents or changes affecting the Section 4 commitments as required by law.

## 9. Children

HayFlow is a business tool and is **not directed to children under 16**. We do not knowingly collect their personal information.

## 10. Contact

Privacy questions or requests: **support@hayflow.io**, Dune Summit LLC. Mailing address available on request.
