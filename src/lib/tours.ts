// Guided tour definitions for the lightweight in-app coachmark engine
// (src/components/help/TourGuide.tsx). Tours are data only — the engine
// resolves each step's `target` against a `data-tour="<key>"` attribute in the
// DOM at runtime, skips steps whose target isn't on the current page, and
// persists completion via the markTourComplete server action.
//
// Anchors that exist on every signed-in page (so tours work from anywhere):
//   nav-home, nav-locations, nav-stacks, nav-sales, nav-tickets, nav-reports
//   help            — the floating Help assistant button
// Page-specific anchors:
//   onboarding      — the dashboard "Get started" checklist (office, "/")
//   new-ticket      — the New ticket button (drivers + office, "/tickets")

export interface TourStep {
    /** data-tour value to spotlight. Omit for a centered, target-less card. */
    target?: string;
    title: string;
    body: string;
}

export interface Tour {
    id: string;
    label: string;
    /** Pathname where this tour auto-starts on first visit. */
    autoStartPath?: string;
    steps: TourStep[];
}

export const TOURS: Tour[] = [
    {
        id: "office-basics",
        label: "Take the office tour",
        autoStartPath: "/",
        steps: [
            {
                title: "Welcome to HayFlow",
                body: "A 30-second tour of where things live. You run inventory, sales, and invoices from here — let's find the main spots.",
            },
            {
                target: "onboarding",
                title: "Start here",
                body: "This checklist walks you through first setup — your business profile, a barn, a stack, and your first sale. Knock it out top to bottom.",
            },
            {
                target: "nav-stacks",
                title: "Stacks are your hay",
                body: "A stack is one lot of hay — commodity, bale size, quality, and price. Add stacks here, then log production or purchases against them.",
            },
            {
                target: "nav-sales",
                title: "Sales & invoicing",
                body: "Approve driver tickets and bundle them into invoices from the Sales hub. Quick Sale also lives here when you want to sell and invoice in one step.",
            },
            {
                target: "nav-reports",
                title: "See the numbers",
                body: "Reports show stock on hand and money over time — by commodity, barn, and month.",
            },
            {
                target: "help",
                title: "Stuck? Ask anytime",
                body: "Tap here to ask HayFlow a question or reach a real person. That's it — you're set.",
            },
        ],
    },
    {
        id: "driver-basics",
        label: "Take the driver tour",
        autoStartPath: "/tickets",
        steps: [
            {
                title: "Welcome to HayFlow",
                body: "Quick tour. Your job here is simple: file a ticket whenever hay leaves a barn. The office takes it from there.",
            },
            {
                target: "new-ticket",
                title: "File a ticket",
                body: "Tap New ticket when you load out — a sale to a customer, or a barn-to-barn transfer. Pick the stack, the amount, and where it went.",
            },
            {
                target: "nav-tickets",
                title: "Your tickets",
                body: "Everything you've filed shows up here. Ones still waiting on office approval sit at the top.",
            },
            {
                target: "nav-stacks",
                title: "Know your stacks",
                body: "Stacks are the hay lots you'll pick from on a ticket. Browse them here so you know what's where.",
            },
            {
                target: "help",
                title: "Need a hand?",
                body: "Tap here anytime to ask a question or reach the office. You're good to go.",
            },
        ],
    },
];

export function getTourById(id: string): Tour | undefined {
    return TOURS.find((t) => t.id === id);
}

/** Pick the tour that matches the user's role. Drivers get the driver tour. */
export function getTourForRole(flags: { isDriver: boolean; isOffice: boolean }): Tour | undefined {
    if (flags.isDriver) return getTourById("driver-basics");
    return getTourById("office-basics");
}

/** Which tour, if any, should auto-start on this path for this role. */
export function getAutoStartTour(
    pathname: string,
    flags: { isDriver: boolean; isOffice: boolean }
): Tour | undefined {
    if (flags.isDriver) {
        return pathname.startsWith("/tickets") ? getTourById("driver-basics") : undefined;
    }
    if (flags.isOffice) {
        return pathname === "/" ? getTourById("office-basics") : undefined;
    }
    return undefined;
}
