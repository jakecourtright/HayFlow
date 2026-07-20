// TEMPORARY — Sentry verification route. Throws on purpose so we can confirm
// server-side errors reach Sentry in production. Delete after verification.
export async function GET() {
    throw new Error("Sentry verification: server-side test error from /api/sentry-check");
}
