import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { redirect } from "next/navigation";
import ReportsClient from "./ReportsClient";

export interface ReportData {
    // KPI summaries
    totalRevenue: number;
    totalCost: number;
    totalProduction: number;
    totalSalesBales: number;
    totalPurchaseBales: number;

    // Monthly trends (revenue & cost over time)
    monthlyTrends: {
        month: string;       // "Jan 2025"
        monthKey: string;    // "2025-01"
        revenue: number;
        cost: number;
        production: number;
        salesBales: number;
        purchaseBales: number;
        adjustments: number;
    }[];

    // Stock by commodity (current snapshot)
    stockByCommodity: {
        commodity: string;
        bales: number;
        tons: number;
    }[];

    // Revenue by commodity
    revenueByCommodity: {
        commodity: string;
        revenue: number;
    }[];

    // Top entities (buyers/sellers)
    topEntities: {
        entity: string;
        type: 'buyer' | 'seller';
        bales: number;
        revenue: number;
        transactions: number;
    }[];

    // Location utilization
    locationUtilization: {
        name: string;
        used: number;
        capacity: number;
        unit: string;
    }[];
}

async function getReportData(orgId: string): Promise<ReportData> {
    const client = await pool.connect();
    try {
        // ---- KPI Totals ----
        const totalsRes = await client.query(`
            SELECT
                COALESCE(SUM(CASE WHEN t.type = 'sale' THEN t.amount * (COALESCE(s.weight_per_bale, 1200)::decimal / 2000) * t.price ELSE 0 END), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN t.type = 'purchase' THEN t.amount * (COALESCE(s.weight_per_bale, 1200)::decimal / 2000) * t.price ELSE 0 END), 0) as total_cost,
                COALESCE(SUM(CASE WHEN t.type = 'production' THEN t.amount ELSE 0 END), 0) as total_production,
                COALESCE(SUM(CASE WHEN t.type = 'sale' THEN t.amount ELSE 0 END), 0) as total_sales_bales,
                COALESCE(SUM(CASE WHEN t.type = 'purchase' THEN t.amount ELSE 0 END), 0) as total_purchase_bales
            FROM transactions t
            LEFT JOIN stacks s ON t.stack_id = s.id
            WHERE t.org_id = $1
        `, [orgId]);

        // ---- Monthly Trends ----
        const trendsRes = await client.query(`
            SELECT
                TO_CHAR(t.date, 'YYYY-MM') as month_key,
                TO_CHAR(t.date, 'Mon YYYY') as month_label,
                COALESCE(SUM(CASE WHEN t.type = 'sale' THEN t.amount * (COALESCE(s.weight_per_bale, 1200)::decimal / 2000) * t.price ELSE 0 END), 0) as revenue,
                COALESCE(SUM(CASE WHEN t.type = 'purchase' THEN t.amount * (COALESCE(s.weight_per_bale, 1200)::decimal / 2000) * t.price ELSE 0 END), 0) as cost,
                COALESCE(SUM(CASE WHEN t.type = 'production' THEN t.amount ELSE 0 END), 0) as production,
                COALESCE(SUM(CASE WHEN t.type = 'sale' THEN t.amount ELSE 0 END), 0) as sales_bales,
                COALESCE(SUM(CASE WHEN t.type = 'purchase' THEN t.amount ELSE 0 END), 0) as purchase_bales,
                COALESCE(SUM(CASE WHEN t.type = 'adjustment' THEN t.amount ELSE 0 END), 0) as adjustments
            FROM transactions t
            LEFT JOIN stacks s ON t.stack_id = s.id
            WHERE t.org_id = $1
            GROUP BY month_key, month_label
            ORDER BY month_key ASC
        `, [orgId]);

        // ---- Stock by Commodity (current snapshot) ----
        const commodityStockRes = await client.query(`
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
        `, [orgId]);

        // Aggregate by commodity
        const commodityMap = new Map<string, { bales: number; tons: number }>();
        for (const row of commodityStockRes.rows) {
            const bales = parseFloat(row.bales);
            const tons = (bales * parseFloat(row.weight_per_bale)) / 2000;
            const existing = commodityMap.get(row.commodity) || { bales: 0, tons: 0 };
            commodityMap.set(row.commodity, {
                bales: existing.bales + bales,
                tons: existing.tons + tons,
            });
        }
        const stockByCommodity = Array.from(commodityMap.entries())
            .map(([commodity, data]) => ({ commodity, ...data }))
            .filter(item => item.bales > 0)
            .sort((a, b) => b.tons - a.tons);

        // ---- Revenue by Commodity ----
        const revByCommodityRes = await client.query(`
            SELECT
                s.commodity,
                COALESCE(SUM(t.amount * (COALESCE(s.weight_per_bale, 1200)::decimal / 2000) * t.price), 0) as revenue
            FROM transactions t
            JOIN stacks s ON t.stack_id = s.id
            WHERE t.org_id = $1 AND t.type = 'sale'
            GROUP BY s.commodity
            ORDER BY revenue DESC
        `, [orgId]);

        // ---- Top Entities ----
        const topBuyersRes = await client.query(`
            SELECT
                t.entity,
                SUM(t.amount) as bales,
                SUM(t.amount * (COALESCE(s.weight_per_bale, 1200)::decimal / 2000) * t.price) as revenue,
                COUNT(*) as transactions
            FROM transactions t
            LEFT JOIN stacks s ON t.stack_id = s.id
            WHERE t.org_id = $1 AND t.type = 'sale' AND t.entity IS NOT NULL AND t.entity != ''
            GROUP BY t.entity
            ORDER BY revenue DESC
            LIMIT 10
        `, [orgId]);

        const topSellersRes = await client.query(`
            SELECT
                t.entity,
                SUM(t.amount) as bales,
                SUM(t.amount * (COALESCE(s.weight_per_bale, 1200)::decimal / 2000) * t.price) as cost,
                COUNT(*) as transactions
            FROM transactions t
            LEFT JOIN stacks s ON t.stack_id = s.id
            WHERE t.org_id = $1 AND t.type = 'purchase' AND t.entity IS NOT NULL AND t.entity != ''
            GROUP BY t.entity
            ORDER BY cost DESC
            LIMIT 10
        `, [orgId]);

        const topEntities = [
            ...topBuyersRes.rows.map((r: any) => ({
                entity: r.entity,
                type: 'buyer' as const,
                bales: parseFloat(r.bales),
                revenue: parseFloat(r.revenue),
                transactions: parseInt(r.transactions),
            })),
            ...topSellersRes.rows.map((r: any) => ({
                entity: r.entity,
                type: 'seller' as const,
                bales: parseFloat(r.bales),
                revenue: parseFloat(r.cost),
                transactions: parseInt(r.transactions),
            })),
        ];

        // ---- Location Utilization ----
        const locRes = await client.query(`
            SELECT
                l.id,
                l.name,
                l.capacity,
                l.unit,
                COALESCE(SUM(
                    CASE WHEN t.type IN ('production', 'purchase') THEN t.amount ELSE -t.amount END
                ), 0) as used
            FROM locations l
            LEFT JOIN transactions t ON l.id = t.location_id AND t.org_id = $1
            WHERE l.org_id = $1
            GROUP BY l.id, l.name, l.capacity, l.unit
            ORDER BY l.name
        `, [orgId]);

        return {
            totalRevenue: parseFloat(totalsRes.rows[0].total_revenue),
            totalCost: parseFloat(totalsRes.rows[0].total_cost),
            totalProduction: parseFloat(totalsRes.rows[0].total_production),
            totalSalesBales: parseFloat(totalsRes.rows[0].total_sales_bales),
            totalPurchaseBales: parseFloat(totalsRes.rows[0].total_purchase_bales),
            monthlyTrends: trendsRes.rows.map((r: any) => ({
                month: r.month_label,
                monthKey: r.month_key,
                revenue: parseFloat(r.revenue),
                cost: parseFloat(r.cost),
                production: parseFloat(r.production),
                salesBales: parseFloat(r.sales_bales),
                purchaseBales: parseFloat(r.purchase_bales),
                adjustments: parseFloat(r.adjustments),
            })),
            stockByCommodity,
            revenueByCommodity: revByCommodityRes.rows.map((r: any) => ({
                commodity: r.commodity,
                revenue: parseFloat(r.revenue),
            })),
            topEntities,
            locationUtilization: locRes.rows.map((r: any) => ({
                name: r.name,
                used: Math.max(0, parseFloat(r.used)),
                capacity: parseFloat(r.capacity),
                unit: r.unit || 'bales',
            })),
        };
    } finally {
        client.release();
    }
}

export default async function ReportsPage() {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) redirect("/sign-in");

    const data = await getReportData(orgId);

    return <ReportsClient data={data} />;
}
