// HayFlow help knowledge base — single source of truth.
//
// Powers three things:
//   1. The Help Center (/help and /help/[slug])
//   2. Inline HelpTip "Learn more" links
//   3. The "Ask HayFlow" AI assistant's grounding context (getKnowledgeBaseText)
//
// Keep the voice grounded, confident, warm, practical. Plain language.
// No fluff. Address the reader like a peer who knows hay, not software.

export type HelpAudience = 'all' | 'office' | 'driver';

export type HelpCategoryId =
    | 'getting-started'
    | 'inventory'
    | 'sales'
    | 'invoices'
    | 'reports'
    | 'team'
    | 'account';

export interface HelpCategory {
    id: HelpCategoryId;
    label: string;
    blurb: string;
    /** lucide-react icon name; mapped to a component in the Help Center page. */
    icon: string;
}

export type HelpBlock =
    | { type: 'p'; text: string }
    | { type: 'h'; text: string }
    | { type: 'steps'; items: string[] }
    | { type: 'list'; items: string[] }
    | { type: 'callout'; tone: 'info' | 'warning' | 'success'; text: string };

export interface HelpArticle {
    slug: string;
    title: string;
    category: HelpCategoryId;
    audience: HelpAudience;
    summary: string;
    keywords: string[];
    body: HelpBlock[];
    related?: string[];
}

// Ordered for display in the Help Center.
export const HELP_CATEGORIES: HelpCategory[] = [
    { id: 'getting-started', label: 'Getting started', blurb: 'The big picture and your first week.', icon: 'Sparkles' },
    { id: 'inventory', label: 'Inventory', blurb: 'Stacks, barns, and keeping counts honest.', icon: 'Box' },
    { id: 'sales', label: 'Sales & tickets', blurb: 'Selling hay and moving it between barns.', icon: 'Receipt' },
    { id: 'invoices', label: 'Invoices', blurb: 'Billing customers and getting paid.', icon: 'FileText' },
    { id: 'reports', label: 'Reports', blurb: 'Reading the numbers.', icon: 'BarChart3' },
    { id: 'team', label: 'Your team', blurb: 'Inviting people and setting roles.', icon: 'Users' },
    { id: 'account', label: 'Account & billing', blurb: 'Subscription, trial, and settings.', icon: 'Settings' },
];

export const HELP_ARTICLES: HelpArticle[] = [
    // ===== GETTING STARTED =====
    {
        slug: 'how-hayflow-works',
        title: 'How HayFlow works',
        category: 'getting-started',
        audience: 'all',
        summary: 'The five things HayFlow tracks and how they fit together.',
        keywords: ['overview', 'basics', 'mental model', 'getting started', 'what is', 'stack', 'location', 'ticket', 'transaction', 'invoice', 'flow'],
        body: [
            { type: 'p', text: 'HayFlow tracks hay from the field to the invoice. There are five pieces, and once they click, the whole app makes sense.' },
            { type: 'list', items: [
                'Locations — your barns and yards. Where hay is stored.',
                'Stacks — a lot of hay: a commodity, bale size, quality, and price. Think of it as one cutting or one batch.',
                'Transactions — every movement of inventory: production (baled), purchase (bought in), sale (sold), or adjustment (a correction).',
                'Tickets — a record made when hay leaves a barn: a sale to a customer, or a transfer between barns. Tickets wait for the office to approve.',
                'Invoices — approved sale tickets, bundled together and billed to a customer with a shareable link.',
            ] },
            { type: 'h', text: 'The everyday flow' },
            { type: 'steps', items: [
                'You store hay in a Location.',
                'You define what it is as a Stack.',
                'When you bale or buy, you log a Transaction so HayFlow knows what is on hand.',
                'When hay goes out, someone files a Ticket.',
                'The office approves the ticket, then bundles approved tickets into an Invoice and sends it.',
            ] },
            { type: 'callout', tone: 'info', text: 'Amounts are always counted in bales. Prices are stored per ton. HayFlow does the bale-to-ton math for you.' },
        ],
        related: ['stacks-explained', 'how-sales-work', 'roles-explained'],
    },
    {
        slug: 'roles-explained',
        title: 'Roles: who can do what',
        category: 'getting-started',
        audience: 'all',
        summary: 'Admins and bookkeepers run the office. Drivers work the field.',
        keywords: ['roles', 'permissions', 'admin', 'bookkeeper', 'driver', 'access', 'cannot see', 'hidden', 'office', 'field'],
        body: [
            { type: 'p', text: 'HayFlow has three roles. Each one sees a version of the app built for the job.' },
            { type: 'h', text: 'Admin' },
            { type: 'p', text: 'Full access. Runs the business, manages the team, sets up billing, and does everything a bookkeeper can.' },
            { type: 'h', text: 'Bookkeeper' },
            { type: 'p', text: 'The office. Approves tickets, builds and sends invoices, manages inventory and stacks, sells walk-ins with Quick Sale. No team or billing control.' },
            { type: 'h', text: 'Driver' },
            { type: 'p', text: 'The field. Drivers file tickets when hay leaves a barn and see only the tickets they created. They never see prices, invoices, reports, or the dashboard — by design, so the phone stays simple.' },
            { type: 'callout', tone: 'info', text: 'If a driver says "I can\'t find invoices" — that\'s expected. Drivers file tickets; the office handles the money.' },
        ],
        related: ['how-sales-work', 'inviting-your-team'],
    },
    {
        slug: 'first-week-setup',
        title: 'Setting up your first week',
        category: 'getting-started',
        audience: 'office',
        summary: 'The order to set things up so the sales loop works end to end.',
        keywords: ['setup', 'onboarding', 'get started', 'first time', 'new account', 'checklist', 'begin'],
        body: [
            { type: 'p', text: 'Do these in order. Each one unlocks the next.' },
            { type: 'steps', items: [
                'Fill in your business profile (Settings → Business) — name, address, and how customers pay you. This shows up on every invoice.',
                'Add your first barn (Locations → New) so you have somewhere to store hay.',
                'Add your first stack (Stacks → New) — the commodity, bale size, and price.',
                'Log your starting inventory (Log → Production or Purchase) so counts are real.',
                'Invite your team (Settings → Team) and set each person\'s role.',
                'Run the loop: have a driver file a ticket, approve it, and send an invoice — or sell a walk-in with Quick Sale.',
            ] },
            { type: 'callout', tone: 'success', text: 'The Get Started checklist on your dashboard tracks most of these and disappears once you\'re rolling.' },
        ],
        related: ['business-profile', 'locations-explained', 'stacks-explained', 'inviting-your-team'],
    },

    // ===== INVENTORY =====
    {
        slug: 'stacks-explained',
        title: 'What is a stack?',
        category: 'inventory',
        audience: 'all',
        summary: 'A stack is one lot of hay — its commodity, bale size, quality, and price.',
        keywords: ['stack', 'lot', 'cutting', 'batch', 'commodity', 'bale size', 'quality', 'price', 'product'],
        body: [
            { type: 'p', text: 'A stack is a single lot of hay — one cutting, one batch, one product you sell. It carries everything that defines that hay:' },
            { type: 'list', items: [
                'Commodity — alfalfa, grass, oat, straw, and so on.',
                'Bale size — sets the default weight per bale.',
                'Quality — your grade or grade note.',
                'Base price — what you sell it for, stored per ton.',
            ] },
            { type: 'p', text: 'The same stack can live in more than one barn. HayFlow tracks how many bales of it are in each location.' },
            { type: 'callout', tone: 'info', text: 'New cutting? That\'s usually a new stack. Same hay moved to another barn? Same stack, just a transfer.' },
        ],
        related: ['locations-explained', 'understanding-units', 'logging-inventory'],
    },
    {
        slug: 'locations-explained',
        title: 'Locations (barns & yards)',
        category: 'inventory',
        audience: 'all',
        summary: 'Locations are where hay is stored. Set a capacity to see fill levels.',
        keywords: ['location', 'barn', 'yard', 'storage', 'capacity', 'fill', 'where'],
        body: [
            { type: 'p', text: 'A location is anywhere you keep hay — a barn, a shed, a stack yard. Give it a name and, if you want, a capacity so HayFlow can show how full it is.' },
            { type: 'p', text: 'Every transaction and ticket points at a location, so your counts are always "this many bales, in this barn."' },
        ],
        related: ['stacks-explained', 'barn-to-barn-transfers'],
    },
    {
        slug: 'understanding-units',
        title: 'Bales, tons, and price',
        category: 'inventory',
        audience: 'all',
        summary: 'Count in bales, price per ton. Net lbs is the scale-ticket weight.',
        keywords: ['units', 'bales', 'tons', 'price', 'per ton', 'per bale', 'net lbs', 'weight', 'scale', 'conversion'],
        body: [
            { type: 'p', text: 'HayFlow keeps amounts in bales and prices per ton. That keeps counts and money consistent no matter the bale size.' },
            { type: 'list', items: [
                'Bales — how you count inventory and tickets.',
                'Weight per bale — set on the stack; HayFlow uses it to convert bales to tons.',
                'Price per ton — the canonical price. You can type a price per bale and HayFlow normalizes it to per ton on save.',
                'Net lbs — optional. The actual scale-ticket weight for a load, when you have it.',
            ] },
            { type: 'callout', tone: 'info', text: 'Entered a per-bale price? HayFlow converts and stores it per ton so your reports stay apples-to-apples.' },
        ],
        related: ['stacks-explained', 'how-sales-work'],
    },
    {
        slug: 'logging-inventory',
        title: 'Logging inventory (production, purchase, adjustment)',
        category: 'inventory',
        audience: 'office',
        summary: 'The Log records hay coming in or corrections — not sales.',
        keywords: ['log', 'production', 'purchase', 'adjustment', 'add inventory', 'baled', 'bought', 'correction', 'count'],
        body: [
            { type: 'p', text: 'Use Log to tell HayFlow about inventory events:' },
            { type: 'list', items: [
                'Production — you baled hay. Adds bales to a stack at a location.',
                'Purchase — you bought hay in. Also adds bales.',
                'Adjustment — a correction, up or down, to make the count match reality.',
            ] },
            { type: 'callout', tone: 'warning', text: 'You can\'t record a sale from the Log. Sales always flow through a ticket (field) or Quick Sale (office) so they produce proper paperwork. This is on purpose.' },
        ],
        related: ['how-sales-work', 'understanding-units'],
    },

    // ===== SALES & TICKETS =====
    {
        slug: 'how-sales-work',
        title: 'How selling works in HayFlow',
        category: 'sales',
        audience: 'all',
        summary: 'Two front doors: drivers file field tickets; the office sells with Quick Sale.',
        keywords: ['sell', 'sale', 'how to sell', 'ticket', 'quick sale', 'customer', 'approve', 'where do i sell'],
        body: [
            { type: 'p', text: 'There is one clean path for selling hay, and it adapts to your role.' },
            { type: 'h', text: 'In the field — drivers' },
            { type: 'p', text: 'A driver files a sale ticket when hay leaves the barn: pick the stack, the pick-up location, the bale count, and the customer. The ticket starts as pending and routes to the office. Drivers don\'t set prices.' },
            { type: 'h', text: 'In the office — admins & bookkeepers' },
            { type: 'p', text: 'For a walk-in or a deal you\'re closing yourself, use Quick Sale. It records the sale, moves the inventory, and creates the invoice in one step. For field tickets, you approve them and bundle them into invoices.' },
            { type: 'callout', tone: 'info', text: 'Tickets never carry a price. Pricing happens when the office builds the invoice — that keeps field work fast and money in one place.' },
        ],
        related: ['creating-a-ticket', 'quick-sale', 'approving-tickets', 'building-invoices'],
    },
    {
        slug: 'creating-a-ticket',
        title: 'Filing a ticket',
        category: 'sales',
        audience: 'all',
        summary: 'Record hay leaving a barn — a sale to a customer or a transfer.',
        keywords: ['ticket', 'new ticket', 'create ticket', 'file ticket', 'sale ticket', 'load out', 'driver', 'pending'],
        body: [
            { type: 'p', text: 'A ticket records hay leaving a barn. There are two kinds:' },
            { type: 'list', items: [
                'Sale — loading out to a customer.',
                'Transfer (barn-to-barn) — moving hay to another location.',
            ] },
            { type: 'h', text: 'To file one' },
            { type: 'steps', items: [
                'Open Tickets → New.',
                'Pick the type (drivers choose Sale or Transfer; the office files transfers here and sells with Quick Sale).',
                'Choose the stack, then the pick-up location. HayFlow shows what\'s available there.',
                'Enter the bale count. For a sale, add the customer (and net lbs if you have a scale ticket). For a transfer, pick the destination.',
                'Submit. The ticket is now pending.',
            ] },
            { type: 'callout', tone: 'info', text: 'Inventory doesn\'t move until the office approves the ticket. A pending ticket is just a request.' },
        ],
        related: ['how-sales-work', 'approving-tickets', 'barn-to-barn-transfers'],
    },
    {
        slug: 'quick-sale',
        title: 'Quick Sale (office)',
        category: 'sales',
        audience: 'office',
        summary: 'Sell and invoice a walk-in in one step.',
        keywords: ['quick sale', 'walk-in', 'sell now', 'one step', 'cash sale', 'office sale'],
        body: [
            { type: 'p', text: 'Quick Sale is for when you\'re closing the deal yourself — a walk-in buyer, a phone order you\'re handling. It does three things at once: records the sale, moves the inventory, and creates the invoice.' },
            { type: 'steps', items: [
                'Open Quick Sale.',
                'Pick the stack and the location you\'re selling from.',
                'Enter bales, the price, and the customer.',
                'Submit — the invoice is created and ready to send.',
            ] },
            { type: 'callout', tone: 'info', text: 'Quick Sale is office-only. Drivers sell by filing a field ticket that you approve.' },
        ],
        related: ['how-sales-work', 'sending-invoices'],
    },
    {
        slug: 'approving-tickets',
        title: 'Approving & rejecting tickets',
        category: 'sales',
        audience: 'office',
        summary: 'Review pending tickets. Approving moves the inventory.',
        keywords: ['approve', 'reject', 'pending', 'review', 'dispatch', 'queue', 'driver ticket'],
        body: [
            { type: 'p', text: 'Pending tickets from drivers land in your queue. Open one to review it.' },
            { type: 'list', items: [
                'Approve — HayFlow records the transaction and moves the inventory. A sale ticket becomes ready to invoice.',
                'Reject — the ticket is declined and no inventory moves.',
            ] },
            { type: 'callout', tone: 'warning', text: 'Approving is what actually moves bales. Until then the count is unchanged.' },
        ],
        related: ['creating-a-ticket', 'building-invoices'],
    },
    {
        slug: 'barn-to-barn-transfers',
        title: 'Barn-to-barn transfers',
        category: 'sales',
        audience: 'all',
        summary: 'Move hay between locations without selling it.',
        keywords: ['transfer', 'barn to barn', 'move', 'relocate', 'between barns', 'destination'],
        body: [
            { type: 'p', text: 'A transfer moves bales from one location to another. No customer, no price — just relocating your own hay.' },
            { type: 'steps', items: [
                'Tickets → New, choose Transfer.',
                'Pick the stack and the source location.',
                'Enter bales and choose the destination location.',
                'Submit, then approve it (office) to move the count.',
            ] },
        ],
        related: ['creating-a-ticket', 'locations-explained'],
    },

    // ===== INVOICES =====
    {
        slug: 'building-invoices',
        title: 'Building an invoice',
        category: 'invoices',
        audience: 'office',
        summary: 'Bundle a customer\'s approved sale tickets and set pricing.',
        keywords: ['invoice', 'build invoice', 'bundle', 'dispatch', 'create invoice', 'price', 'line items'],
        body: [
            { type: 'p', text: 'Once sale tickets are approved, they wait in the dispatch queue to be invoiced.' },
            { type: 'steps', items: [
                'Open Dispatch (the Sales tab).',
                'Pick the approved tickets for one customer.',
                'Set the price — per ton or per bale.',
                'Create the invoice. It gets an invoice number and a private share link.',
            ] },
            { type: 'callout', tone: 'info', text: 'A walk-in done through Quick Sale already has its invoice — no need to build one.' },
        ],
        related: ['approving-tickets', 'sending-invoices', 'business-profile'],
    },
    {
        slug: 'sending-invoices',
        title: 'Sending an invoice & getting paid',
        category: 'invoices',
        audience: 'office',
        summary: 'Share the link, mark it sent, then mark it paid.',
        keywords: ['send invoice', 'share link', 'mark sent', 'mark paid', 'payment', 'email', 'text', 'collect', 'outstanding'],
        body: [
            { type: 'p', text: 'Invoices are sent by you, on purpose — so you stay in control of how you reach each customer.' },
            { type: 'steps', items: [
                'Open the invoice.',
                'Copy the share link and send it to your customer by text or email.',
                'Mark the invoice Sent so it shows as awaiting payment.',
                'When the money comes in, mark it Paid.',
            ] },
            { type: 'p', text: 'The customer opens the link with no login and sees a clean invoice they can print. Sent-but-unpaid invoices add up on your dashboard\'s Outstanding card.' },
            { type: 'callout', tone: 'warning', text: 'HayFlow doesn\'t auto-email invoices yet. Copy the link and send it yourself, then mark it sent.' },
        ],
        related: ['building-invoices', 'business-profile'],
    },
    {
        slug: 'business-profile',
        title: 'Your business profile on invoices',
        category: 'invoices',
        audience: 'office',
        summary: 'Fill this in so customers know who they\'re paying and how.',
        keywords: ['business profile', 'company info', 'payment instructions', 'address', 'who to pay', 'invoice header', 'settings'],
        body: [
            { type: 'p', text: 'Your business profile is the name, address, contact, and payment instructions shown at the top of every invoice. Until it\'s filled in, invoices won\'t tell customers who to pay or how.' },
            { type: 'steps', items: [
                'Go to Settings → Business.',
                'Enter your business name, address, phone, and email.',
                'Add payment instructions — where and how to send money.',
                'Save. Every invoice picks it up automatically.',
            ] },
        ],
        related: ['sending-invoices', 'first-week-setup'],
    },

    // ===== REPORTS =====
    {
        slug: 'reading-reports',
        title: 'Reading your reports',
        category: 'reports',
        audience: 'office',
        summary: 'Revenue, stock, top buyers, and barn utilization at a glance.',
        keywords: ['reports', 'revenue', 'kpi', 'stock', 'trends', 'top buyers', 'utilization', 'analytics', 'numbers'],
        body: [
            { type: 'p', text: 'Reports turn your day-to-day entries into the numbers that matter:' },
            { type: 'list', items: [
                'Revenue and cost trends month over month.',
                'Stock and revenue broken out by commodity.',
                'Your top buyers and sellers.',
                'How full each barn is running.',
            ] },
            { type: 'callout', tone: 'info', text: 'Reports are only as good as your entries. Log production and keep invoices marked paid to keep them honest.' },
        ],
        related: ['logging-inventory', 'sending-invoices'],
    },

    // ===== TEAM =====
    {
        slug: 'inviting-your-team',
        title: 'Inviting your team',
        category: 'team',
        audience: 'office',
        summary: 'Add drivers and bookkeepers and set each person\'s role.',
        keywords: ['team', 'invite', 'add user', 'members', 'driver', 'bookkeeper', 'role', 'staff', 'employees'],
        body: [
            { type: 'p', text: 'Add the people who work with you and give each the right role.' },
            { type: 'steps', items: [
                'Go to Settings → Team (admins only).',
                'Invite a person by email.',
                'Pick their role: Admin, Bookkeeper, or Driver.',
                'They get an invite and land in the version of HayFlow built for their role.',
            ] },
            { type: 'callout', tone: 'info', text: 'Give field staff the Driver role — it keeps their phone to just Locations, Stacks, and Tickets.' },
        ],
        related: ['roles-explained'],
    },

    // ===== ACCOUNT & BILLING =====
    {
        slug: 'billing-and-trial',
        title: 'Trial, plans & billing',
        category: 'account',
        audience: 'office',
        summary: 'How the free trial works and what a subscription unlocks.',
        keywords: ['billing', 'subscription', 'trial', 'plan', 'price', 'pay', 'upgrade', 'pro', 'team plan', 'card'],
        body: [
            { type: 'p', text: 'HayFlow starts with a 14-day free trial so you can set things up and run a few real loads before paying.' },
            { type: 'list', items: [
                'Pro — for a solo operation.',
                'Pro Team — when you\'ve got drivers and bookkeepers working together.',
            ] },
            { type: 'p', text: 'Manage your plan anytime under Settings → Billing. While subscribed (or on trial), all the write features — logging, tickets, invoices — stay unlocked.' },
            { type: 'callout', tone: 'info', text: 'When a trial ends without a plan, your data stays put — you just can\'t add new records until you subscribe.' },
        ],
        related: ['first-week-setup'],
    },
    {
        slug: 'themes-and-settings',
        title: 'Themes & personal settings',
        category: 'account',
        audience: 'all',
        summary: 'Pick a look that\'s easy on your eyes. It\'s per-person.',
        keywords: ['theme', 'dark mode', 'light mode', 'color', 'settings', 'appearance', 'personalize'],
        body: [
            { type: 'p', text: 'Under Settings you can pick from a range of light and dark themes. Your choice is yours alone — it doesn\'t change what teammates see.' },
        ],
        related: [],
    },
];

// ============ HELPERS ============

export function getArticle(slug: string): HelpArticle | undefined {
    return HELP_ARTICLES.find((a) => a.slug === slug);
}

export function getCategory(id: HelpCategoryId): HelpCategory | undefined {
    return HELP_CATEGORIES.find((c) => c.id === id);
}

interface RoleContext {
    isOffice: boolean;
    isDriver: boolean;
}

/** Articles a given role should see. Office sees all + office; drivers see all + driver. */
export function getArticlesForRole({ isOffice, isDriver }: RoleContext): HelpArticle[] {
    return HELP_ARTICLES.filter((a) => {
        if (a.audience === 'all') return true;
        if (a.audience === 'office') return isOffice;
        if (a.audience === 'driver') return isDriver;
        return false;
    });
}

/** Flatten an article's body to plain text — used for search and AI grounding. */
export function flattenArticleText(article: HelpArticle): string {
    const parts: string[] = [article.title, article.summary];
    for (const block of article.body) {
        if (block.type === 'p' || block.type === 'h' || block.type === 'callout') {
            parts.push(block.text);
        } else if (block.type === 'steps' || block.type === 'list') {
            parts.push(block.items.join('. '));
        }
    }
    return parts.join(' ');
}

/**
 * Tiny keyword search. Scores title/keywords highest, then summary, then body.
 * Returns matching articles sorted by score (best first). Empty query → input order.
 */
export function searchArticles(query: string, articles: HelpArticle[]): HelpArticle[] {
    const q = query.trim().toLowerCase();
    if (!q) return articles;
    const terms = q.split(/\s+/).filter(Boolean);

    const scored = articles
        .map((article) => {
            const title = article.title.toLowerCase();
            const summary = article.summary.toLowerCase();
            const keywords = article.keywords.join(' ').toLowerCase();
            const bodyText = flattenArticleText(article).toLowerCase();

            let score = 0;
            for (const term of terms) {
                if (title.includes(term)) score += 10;
                if (keywords.includes(term)) score += 6;
                if (summary.includes(term)) score += 4;
                if (bodyText.includes(term)) score += 1;
            }
            // Small bonus for matching the whole phrase in the title.
            if (title.includes(q)) score += 8;
            return { article, score };
        })
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score);

    return scored.map((s) => s.article);
}

/**
 * Concatenate the knowledge base into a single grounding document for the
 * AI assistant. Includes every article so the model has full context; the
 * caller passes the user's role separately to tailor the answer.
 */
export function getKnowledgeBaseText(): string {
    return HELP_ARTICLES.map((a) => {
        const cat = getCategory(a.category)?.label ?? a.category;
        return `### ${a.title} (category: ${cat}, audience: ${a.audience})\n${flattenArticleText(a)}`;
    }).join('\n\n');
}
