// Edge-runtime Sentry init (middleware, edge routes). No-ops unless SENTRY_DSN
// is set. Imported by src/instrumentation.ts.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    enabled: !!process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
});
