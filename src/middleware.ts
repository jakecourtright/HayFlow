import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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
]);

export default clerkMiddleware(async (auth, req) => {
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
