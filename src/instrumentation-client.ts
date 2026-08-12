// Client-side Sentry init. No-ops unless NEXT_PUBLIC_SENTRY_DSN is set.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    // Transient network blips, not app bugs. ClerkJS's periodic session
    // /touch ping fails whenever a phone drops signal or Safari suspends the
    // tab mid-request (common for field users); Clerk retries on its own.
    // "Load failed" / "Failed to fetch" are the browsers' generic messages
    // for the same dropped-connection class of error.
    ignoreErrors: [
        /ClerkJS: Network error/i,
        "TypeError: Load failed",
        "TypeError: Failed to fetch",
        "TypeError: NetworkError when attempting to fetch resource.",
    ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
