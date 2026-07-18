// Server-side Sentry init. No-ops unless SENTRY_DSN is set, so dev/build and
// unconfigured deploys are unaffected. Imported by src/instrumentation.ts.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    enabled: !!process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    // Don't send PII by default — Customer Data privacy (see docs/legal/privacy-policy.md).
    sendDefaultPii: false,
});
