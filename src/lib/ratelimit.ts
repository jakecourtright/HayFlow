// Rate limiting for the public, unauthenticated invoice share endpoint.
//
// Uses Upstash Redis (works on the edge runtime). It is OPTIONAL: when the
// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN env vars are absent — e.g.
// local dev, or before you've provisioned Upstash — this becomes a no-op that
// allows every request, so nothing breaks. Configure the env vars in production
// to switch protection on. Also fails open if Upstash itself errors, so a Redis
// outage never takes down invoice viewing.
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let limiter: Ratelimit | null = null;

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (url && token) {
    limiter = new Ratelimit({
        redis: new Redis({ url, token }),
        // 20 requests per minute per IP — generous for a human viewing an invoice,
        // restrictive enough to blunt scraping / brute-force of the share token.
        limiter: Ratelimit.slidingWindow(20, "60 s"),
        prefix: "hayflow:invoice",
        analytics: false,
    });
}

/** Returns { success: false } when the identifier (IP) has exceeded the limit. */
export async function checkInvoiceRateLimit(identifier: string): Promise<{ success: boolean }> {
    if (!limiter) return { success: true }; // unconfigured → no-op
    try {
        const { success } = await limiter.limit(identifier);
        return { success };
    } catch {
        return { success: true }; // fail open on limiter errors
    }
}
