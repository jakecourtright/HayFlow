import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect } from "next/navigation";

async function getReportData(orgId: string) {
    const client = await pool.connect();
    try {
        const productionResult = await client.query(`
            SELECT COALESCE(SUM(amount), 0) as total
            FROM transactions
            WHERE org_id = $1 AND type = 'production'
        `, [orgId]);

        const salesResult = await client.query(`
            SELECT 
                COALESCE(SUM(amount), 0) as total_units,
                COALESCE(SUM(amount * price), 0) as total_revenue
            FROM transactions
            WHERE org_id = $1 AND type = 'sale'
        `, [orgId]);

        const purchaseResult = await client.query(`
            SELECT 
                COALESCE(SUM(amount), 0) as total_units,
                COALESCE(SUM(amount * price), 0) as total_cost
            FROM transactions
            WHERE org_id = $1 AND type = 'purchase'
        `, [orgId]);

        return {
            production: parseFloat(productionResult.rows[0].total),
            sales: {
                units: parseFloat(salesResult.rows[0].total_units),
                revenue: parseFloat(salesResult.rows[0].total_revenue)
            },
            purchases: {
                units: parseFloat(purchaseResult.rows[0].total_units),
                cost: parseFloat(purchaseResult.rows[0].total_cost)
            }
        };
    } finally {
        client.release();
    }
}

export default async function ReportsPage() {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    const data = await getReportData(orgId);
    const netPosition = data.sales.revenue - data.purchases.cost;

    return (
        <div>
            <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--accent)' }}>Reports</h1>

            <div className="grid gap-4">
                {/* Production Card */}
                <div className="glass-card">
                    <span className="label-modern">Production Yield</span>
                    <div className="text-3xl font-bold mt-2" style={{ color: 'var(--accent)' }}>
                        {data.production.toLocaleString()}
                    </div>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>
                        Total units baled from fields
                    </p>
                </div>

                {/* Sales Card */}
                <div className="glass-card">
                    <span className="label-modern">Sales Revenue</span>
                    <div className="text-3xl font-bold mt-2" style={{ color: 'var(--primary-light)' }}>
                        ${data.sales.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>
                        From {data.sales.units.toLocaleString()} units sold
                    </p>
                </div>

                {/* Purchases Card */}
                <div className="glass-card">
                    <span className="label-modern">Purchases</span>
                    <div className="text-3xl font-bold mt-2" style={{ color: '#EBF4DD' }}>
                        ${data.purchases.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>
                        {data.purchases.units.toLocaleString()} units purchased
                    </p>
                </div>

                {/* Net Position Card */}
                <div className="glass-card" style={{ borderWidth: '2px', borderColor: 'var(--primary)' }}>
                    <span className="label-modern">Net Position</span>
                    <div
                        className="text-3xl font-bold mt-2"
                        style={{ color: netPosition >= 0 ? 'var(--primary-light)' : '#ef4444' }}
                    >
                        ${netPosition.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>
                        Sales revenue minus purchase costs
                    </p>
                </div>
            </div>
        </div>
    );
}
