import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

// Sentry build-time wrapper. Safe without credentials: source-map upload is
// simply skipped when SENTRY_AUTH_TOKEN / org / project are absent, and runtime
// reporting stays off unless SENTRY_DSN is set (see src/sentry.*.config.ts).
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
});
