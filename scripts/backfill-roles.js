// One-off: backfill org_member_roles from Clerk org memberships, so the app no
// longer depends on Clerk custom-role claims (org:bookkeeper / org:driver) and
// those roles can be safely deleted from the Clerk dashboard.
// Idempotent: ON CONFLICT DO NOTHING — never overwrites a role already set in-app.
const { Pool } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const CLERK_API = 'https://api.clerk.com/v1';

const ROLE_MAP = {
    'org:admin': 'admin',
    'org:bookkeeper': 'bookkeeper',
    'org:driver': 'driver',
    'org:member': 'driver', // least privilege for unmapped basic members
};

async function clerkGet(pathname) {
    const res = await fetch(`${CLERK_API}${pathname}`, {
        headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    });
    if (!res.ok) throw new Error(`Clerk API ${pathname} → ${res.status}: ${await res.text()}`);
    return res.json();
}

async function main() {
    if (!process.env.DATABASE_URL || !process.env.CLERK_SECRET_KEY) {
        console.error('DATABASE_URL and CLERK_SECRET_KEY must be set in .env.local');
        process.exit(1);
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const orgsRes = await clerkGet('/organizations?limit=100');
        const orgs = orgsRes.data || [];
        console.log(`Found ${orgs.length} organization(s)`);

        for (const org of orgs) {
            const memRes = await clerkGet(`/organizations/${org.id}/memberships?limit=100`);
            const memberships = memRes.data || [];
            console.log(`\n${org.name} (${org.id}) — ${memberships.length} member(s)`);

            for (const m of memberships) {
                const userId = m.public_user_data?.user_id;
                const clerkRole = m.role;
                const appRole = ROLE_MAP[clerkRole];
                if (!userId || !appRole) {
                    console.log(`  SKIP user=${userId} clerkRole=${clerkRole} (no mapping)`);
                    continue;
                }
                const result = await pool.query(
                    `INSERT INTO org_member_roles (org_id, user_id, role) VALUES ($1, $2, $3)
                     ON CONFLICT (org_id, user_id) DO NOTHING
                     RETURNING role`,
                    [org.id, userId, appRole]
                );
                const status = result.rows.length ? `inserted as ${appRole}` : 'already set (kept existing)';
                console.log(`  ${m.public_user_data?.identifier || userId}: ${clerkRole} → ${status}`);
            }
        }
        console.log('\nBackfill complete.');
    } finally {
        await pool.end();
    }
}

main().catch((e) => { console.error(e); process.exit(1); });
