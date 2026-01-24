import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import pool from "@/lib/db";
import { Tractor, ShoppingCart, Banknote, Wrench, ArrowRight } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";

async function getStats(orgId: string) {
  const client = await pool.connect();
  try {
    const stockRes = await client.query(`
      SELECT 
        SUM(s.current_stock) as total_stock
      FROM (
        SELECT 
          s.id, 
                  COALESCE(SUM(CASE WHEN t.type IN ('production', 'purchase') THEN t.amount ELSE -t.amount END), 0) as current_stock
        FROM stacks s
        LEFT JOIN transactions t ON s.id = t.stack_id
        WHERE s.org_id = $1
        GROUP BY s.id
      ) s
    `, [orgId]);

    const activityRes = await client.query(`
      SELECT t.*, s.name as stack_name, s.commodity
      FROM transactions t
      LEFT JOIN stacks s ON t.stack_id = s.id
      WHERE t.org_id = $1
      ORDER BY t.date DESC
      LIMIT 5
    `, [orgId]);

    return {
      totalStock: stockRes.rows[0]?.total_stock || 0,
      recentActivity: activityRes.rows
    };
  } finally {
    client.release();
  }
}

export default async function Dashboard() {
  const { orgId } = await auth();
  const stats = orgId ? await getStats(orgId) : { totalStock: 0, recentActivity: [] };

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
        <div className="space-y-6">
          {/* Stats Header - Total Stock */}
          <div className="glass-card flex items-center justify-between py-6 px-8">
            <div>
              <span className="label-modern" style={{ marginBottom: 0 }}>Total Stock</span>
              <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>Bales on hand</p>
            </div>
            <div className="text-5xl font-extrabold" style={{ color: 'var(--primary-light)' }}>
              {stats.totalStock.toLocaleString()}
            </div>
          </div>

          {/* Action Buttons Grid */}
          <div className="grid grid-cols-2 gap-4">
            <Link href="/log?type=production" className="glass-card flex flex-col items-center justify-center p-6 hover:brightness-110 transition-all active:scale-95 text-center group border-2 border-transparent hover:border-[var(--primary)] aspect-square">
              <Tractor size={36} style={{ color: 'var(--primary)', marginBottom: '12px' }} />
              <span className="font-bold text-lg" style={{ color: 'var(--text-main)' }}>Bale</span>
              <span className="text-xs mt-1 opacity-80" style={{ color: 'var(--text-dim)' }}>Production</span>
            </Link>
            <Link href="/log?type=purchase" className="glass-card flex flex-col items-center justify-center p-6 hover:brightness-110 transition-all active:scale-95 text-center group border-2 border-transparent hover:border-[var(--primary)] aspect-square">
              <ShoppingCart size={36} style={{ color: 'var(--primary)', marginBottom: '12px' }} />
              <span className="font-bold text-lg" style={{ color: 'var(--text-main)' }}>Buy</span>
              <span className="text-xs mt-1 opacity-80" style={{ color: 'var(--text-dim)' }}>Purchase</span>
            </Link>
            <Link href="/log?type=sale" className="glass-card flex flex-col items-center justify-center p-6 hover:brightness-110 transition-all active:scale-95 text-center group border-2 border-transparent hover:border-[var(--primary)] aspect-square">
              <Banknote size={36} style={{ color: 'var(--primary)', marginBottom: '12px' }} />
              <span className="font-bold text-lg" style={{ color: 'var(--text-main)' }}>Sell</span>
              <span className="text-xs mt-1 opacity-80" style={{ color: 'var(--text-dim)' }}>Sale</span>
            </Link>
            <Link href="/log?type=adjustment" className="glass-card flex flex-col items-center justify-center p-6 hover:brightness-110 transition-all active:scale-95 text-center group border-2 border-transparent hover:border-[var(--primary)] aspect-square">
              <Wrench size={36} style={{ color: 'var(--primary)', marginBottom: '12px' }} />
              <span className="font-bold text-lg" style={{ color: 'var(--text-main)' }}>Adjust</span>
              <span className="text-xs mt-1 opacity-80" style={{ color: 'var(--text-dim)' }}>Inventory</span>
            </Link>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--accent)' }}>Recent Activity</h2>
            <div className="flex flex-col gap-2">
              {stats.recentActivity.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--text-dim)' }}>No recent activity found.</div>
              ) : (
                stats.recentActivity.map((tx: any) => (
                  <div key={tx.id} className="glass-card flex items-center justify-between py-4 px-5 !rounded-2xl">
                    <div>
                      <div className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>
                        {tx.type === 'production' ? 'Baled' : tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}: {tx.stack_name || 'Unknown Stack'}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                        {tx.commodity} • {new Date(tx.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div
                      className="font-mono font-bold"
                      style={{ color: tx.type === 'sale' ? '#ef4444' : 'var(--primary-light)' }}
                    >
                      {tx.type === 'sale' ? '−' : '+'}{Number(tx.amount).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </SignedIn>
    </>
  );
}
