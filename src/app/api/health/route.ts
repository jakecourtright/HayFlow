// Public health-check endpoint for an external uptime monitor (UptimeRobot,
// Better Stack, Pingdom, etc.). Returns 200 when the app can reach the database,
// 503 otherwise. No auth required (it exposes no data). Point your monitor at
// GET /api/health and alert on non-200.
import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
    try {
        const client = await pool.connect();
        try {
            await client.query("SELECT 1");
        } finally {
            client.release();
        }
        return NextResponse.json({ status: "ok", checkedAt: new Date().toISOString() });
    } catch {
        return NextResponse.json({ status: "error", detail: "database unreachable" }, { status: 503 });
    }
}
