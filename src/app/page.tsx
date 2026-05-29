import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Tractor, Receipt, ClipboardCheck, Users } from 'lucide-react';
import { getDashboardLayout } from "./actions";
import DashboardGrid from "./dashboard/DashboardGrid";
import OnboardingChecklist from "./dashboard/OnboardingChecklist";
import { getPermissionFlags } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Roles } from "@/lib/permissions";
import PageHeader from "@/components/ui/PageHeader";

async function getStats(orgId: string) {
  const client = await pool.connect();
  try {
    // Total stock (bales)
    const stockRes = await client.query(`
      SELECT
        COALESCE(SUM(
          CASE WHEN t.type IN ('production', 'purchase') THEN t.amount ELSE -t.amount END
        ), 0) as total_stock
      FROM transactions t
      JOIN stacks s ON t.stack_id = s.id
      WHERE t.org_id = $1
    `, [orgId]);

    // Stock by commodity (converted to tons)
    const commodityRes = await client.query(`
      SELECT
        s.commodity,
        COALESCE(SUM(
          CASE WHEN t.type IN ('production', 'purchase') THEN t.amount ELSE -t.amount END
        ), 0) as bales,
        COALESCE(s.weight_per_bale, 1200) as weight_per_bale
      FROM stacks s
      LEFT JOIN transactions t ON s.id = t.stack_id
      WHERE s.org_id = $1
      GROUP BY s.commodity, s.weight_per_bale
      HAVING COALESCE(SUM(
        CASE WHEN t.type IN ('production', 'purchase') THEN t.amount ELSE -t.amount END
      ), 0) > 0
      ORDER BY COALESCE(SUM(
        CASE WHEN t.type IN ('production', 'purchase') THEN t.amount ELSE -t.amount END
      ), 0) DESC
    `, [orgId]);

    const commodityMap = new Map<string, number>();
    for (const row of commodityRes.rows) {
      const tons = (parseFloat(row.bales) * parseFloat(row.weight_per_bale)) / 2000;
      const existing = commodityMap.get(row.commodity) || 0;
      commodityMap.set(row.commodity, existing + tons);
    }
    const stockByCommodity = Array.from(commodityMap.entries())
      .map(([commodity, tons]) => ({ commodity, tons }))
      .sort((a, b) => b.tons - a.tons);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const salesRes = await client.query(`
      SELECT
        COALESCE(SUM(
          t.amount * (COALESCE(s.weight_per_bale, 1200)::decimal / 2000) * t.price
        ), 0) as sales_total
      FROM transactions t
      JOIN stacks s ON t.stack_id = s.id
      WHERE t.org_id = $1
        AND t.type = 'sale'
        AND t.date >= $2
    `, [orgId, monthStart]);

    const movedRes = await client.query(`
      SELECT COALESCE(SUM(t.amount), 0) as bales_moved
      FROM transactions t
      WHERE t.org_id = $1 AND t.date >= $2
    `, [orgId, monthStart]);

    const activityRes = await client.query(`
      SELECT t.*, s.name as stack_name, s.commodity
      FROM transactions t
      LEFT JOIN stacks s ON t.stack_id = s.id
      WHERE t.org_id = $1
      ORDER BY t.date DESC
      LIMIT 5
    `, [orgId]);

    return {
      totalStock: parseFloat(stockRes.rows[0]?.total_stock) || 0,
      stockByCommodity,
      salesThisMonth: parseFloat(salesRes.rows[0]?.sales_total) || 0,
      balesMovedThisMonth: parseFloat(movedRes.rows[0]?.bales_moved) || 0,
      recentActivity: activityRes.rows,
    };
  } finally {
    client.release();
  }
}

export default async function Dashboard() {
  const { userId, orgId, has } = await auth();

  // Signed-in users without an org land on /welcome to create one
  if (userId && !orgId) {
    redirect('/welcome');
  }

  // Drivers should not see the dashboard (financial data) — redirect to tickets
  if (has({ role: Roles.DRIVER } as any)) {
    redirect('/tickets');
  }

  const defaultStats = {
    totalStock: 0,
    stockByCommodity: [],
    salesThisMonth: 0,
    balesMovedThisMonth: 0,
    recentActivity: [],
  };

  const stats = orgId ? await getStats(orgId) : defaultStats;
  const layout = await getDashboardLayout();

  return (
    <>
      {!userId && (
        <section className="py-8 md:py-14 space-y-16">
          {/* Hero */}
          <div className="text-center space-y-6 max-w-2xl mx-auto">
            <span className="chip chip-info">For hay growers & dealers</span>
            <h1 className="font-display text-5xl md:text-6xl font-bold leading-[1.02]" style={{ color: 'var(--accent)' }}>
              Hay inventory <span style={{ color: 'var(--primary)' }}>made well.</span>
            </h1>
            <p className="text-lg md:text-xl leading-relaxed" style={{ color: 'var(--text-dim)' }}>
              Track bales from the barn. Approve driver tickets. Send clean invoices customers can actually read. HayFlow is the tool your hay business has been missing.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <SignUpButton mode="modal" fallbackRedirectUrl="/">
                <button className="btn btn-primary">
                  Start free — 14 days
                </button>
              </SignUpButton>
              <SignInButton mode="modal" fallbackRedirectUrl="/">
                <button className="btn btn-secondary">
                  Sign in
                </button>
              </SignInButton>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
              No credit card. Full team features during trial.
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            <FeatureCard
              icon={<Tractor className="w-6 h-6" />}
              title="Track every bale"
              body="Production, purchases, sales, barn-to-barn transfers. Stock updates as work happens."
            />
            <FeatureCard
              icon={<ClipboardCheck className="w-6 h-6" />}
              title="Driver tickets, approved fast"
              body="Drivers create tickets on their phone. Office approves with one tap. Inventory moves automatically."
            />
            <FeatureCard
              icon={<Receipt className="w-6 h-6" />}
              title="Invoices that look professional"
              body="Bundle approved tickets into clean invoices. Share a link — no PDF acrobatics, no email attachments."
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Built for your team"
              body="Roles for admins, bookkeepers, and drivers. Everyone sees what they need, nothing they don't."
            />
          </div>

          {/* Small print */}
          <div className="text-center pt-4">
            <p className="text-xs uppercase tracking-wider font-bold" style={{ color: 'var(--text-dim)' }}>
              Designed for the field. Engineered for the books.
            </p>
          </div>
        </section>
      )}
      {userId && (
        <div className="max-w-3xl mx-auto">
          <PageHeader
            eyebrow="Home"
            title="Dashboard"
            subtitle="Your inventory and activity at a glance."
          />
          <OnboardingChecklist />
          <DashboardGrid stats={stats} layout={layout} canWriteInventory={(await getPermissionFlags()).canWriteInventory} />
        </div>
      )}
    </>
  );
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="glass-card">
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
            color: 'var(--primary)',
          }}
        >
          {icon}
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-base" style={{ color: 'var(--accent)' }}>{title}</h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-dim)' }}>{body}</p>
        </div>
      </div>
    </div>
  );
}
