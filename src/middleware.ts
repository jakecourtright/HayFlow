import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { checkInvoiceRateLimit } from "@/lib/ratelimit";

// Routes that require authentication
const isProtectedRoute = createRouteMatcher([
    '/log(.*)',
    '/locations(.*)',
    '/stacks(.*)',
    '/inventory(.*)',
    '/reports(.*)',
    '/settings(.*)',
    '/tickets(.*)',
    '/dispatch(.*)',
    '/sell(.*)',
    '/transfer(.*)',
    '/welcome(.*)',
    '/billing(.*)',
    '/help(.*)',
]);

// Routes that require an active org (signed-in users without one go to /welcome).
// /welcome itself and /billing must be reachable while orgless / unsubscribed.
const isOrgRequiredRoute = createRouteMatcher([
    '/log(.*)',
    '/locations(.*)',
    '/stacks(.*)',
    '/inventory(.*)',
    '/reports(.*)',
    '/settings(.*)',
    '/tickets(.*)',
    '/dispatch(.*)',
    '/sell(.*)',
    '/transfer(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
    // Rate-limit the public, unauthenticated invoice share endpoint by IP.
    // No-op unless Upstash env vars are configured (see lib/ratelimit.ts).
    if (req.nextUrl.pathname.startsWith('/invoice/')) {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
        const { success } = await checkInvoiceRateLimit(ip);
        if (!success) {
            return new NextResponse('Too many requests. Please slow down and try again shortly.', { status: 429 });
        }
    }

    if (isProtectedRoute(req)) {
        await auth.protect();
    }

    // Force orgless authenticated users through /welcome on every page they touch,
    // not just /. This catches direct URLs / bookmarks too.
    const { userId, orgId } = await auth();
    if (userId && !orgId && isOrgRequiredRoute(req)) {
        const url = req.nextUrl.clone();
        url.pathname = '/welcome';
        return NextResponse.redirect(url);
    }
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        // Always run for API routes
        "/(api|trpc)(.*)",
    ],
};
