import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import { Tractor, Banknote } from 'lucide-react';
import { getDashboardLayout } from "./actions";
import DashboardGrid from "./dashboard/DashboardGrid";
import { getPermissionFlags } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Roles } from "@/lib/permissions";

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

    // Aggregate by commodity name (since multiple stacks of same commodity may have different weights)
    const commodityMap = new Map<string, number>();
    for (const row of commodityRes.rows) {
      const tons = (parseFloat(row.bales) * parseFloat(row.weight_per_bale)) / 2000;
      const existing = commodityMap.get(row.commodity) || 0;
      commodityMap.set(row.commodity, existing + tons);
    }
    const stockByCommodity = Array.from(commodityMap.entries())
      .map(([commodity, tons]) => ({ commodity, tons }))
      .sort((a, b) => b.tons - a.tons);

    // Sales this month ($) — price is $/ton, amount is bales, need to compute revenue
    // Revenue = bales * (weight_per_bale / 2000) * price_per_ton
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

    // Bales moved this month (all transaction types)
    const movedRes = await client.query(`
      SELECT COALESCE(SUM(t.amount), 0) as bales_moved
      FROM transactions t
      WHERE t.org_id = $1 AND t.date >= $2
    `, [orgId, monthStart]);

    // Recent activity
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
  const { orgId, has } = await auth();

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
      <SignedOut>
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-8">
          <div className="space-y-4 max-w-lg">
            <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] bg-clip-text text-transparent">
              HayFlow
            </h1>
            <p className="text-xl" style={{ color: 'var(--text-dim)' }}>
              Modern inventory management for hay producers. Track bales, sales, and storage with ease.
            </p>
          </div>

          <div className="flex gap-4 w-full max-w-xs">
            <SignInButton mode="modal" fallbackRedirectUrl="/">
              <button className="btn btn-primary flex-1">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal" fallbackRedirectUrl="/">
              <button className="btn btn-secondary flex-1">
                Sign Up
              </button>
            </SignUpButton>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full max-w-md mt-12 opacity-80">
            <div className="glass-card p-4">
              <Tractor className="w-8 h-8 mx-auto mb-2 text-[var(--primary)]" />
              <span className="text-sm font-bold">Track Production</span>
            </div>
            <div className="glass-card p-4">
              <Banknote className="w-8 h-8 mx-auto mb-2 text-[var(--primary)]" />
              <span className="text-sm font-bold">Manage Sales</span>
            </div>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <DashboardGrid stats={stats} layout={layout} canWriteInventory={(await getPermissionFlags()).canWriteInventory} />
      </SignedIn>
    </>
  );
}
