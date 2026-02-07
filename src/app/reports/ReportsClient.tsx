'use client';

import { useState, useMemo } from 'react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Calendar, TrendingUp, TrendingDown, DollarSign, Package, Users, MapPin, BarChart3 } from 'lucide-react';
import type { ReportData } from './page';

type DateRange = 'this-month' | 'last-30' | 'this-quarter' | 'this-year' | 'all';

const CHART_COLORS = [
    '#4ade80', '#60a5fa', '#f472b6', '#facc15',
    '#a78bfa', '#fb923c', '#34d399', '#f87171',
    '#818cf8', '#22d3ee',
];

function formatCurrency(val: number): string {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
    return `$${val.toFixed(0)}`;
}

function formatNumber(val: number): string {
    return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function ReportsClient({ data }: { data: ReportData }) {
    const [dateRange, setDateRange] = useState<DateRange>('all');

    // Filter monthly trends by date range
    const filteredTrends = useMemo(() => {
        if (dateRange === 'all') return data.monthlyTrends;

        const now = new Date();
        let cutoff: string;

        switch (dateRange) {
            case 'this-month':
                cutoff = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                return data.monthlyTrends.filter(t => t.monthKey >= cutoff);
            case 'last-30': {
                const d30 = new Date(now);
                d30.setDate(d30.getDate() - 30);
                cutoff = `${d30.getFullYear()}-${String(d30.getMonth() + 1).padStart(2, '0')}`;
                return data.monthlyTrends.filter(t => t.monthKey >= cutoff);
            }
            case 'this-quarter': {
                const qMonth = Math.floor(now.getMonth() / 3) * 3 + 1;
                cutoff = `${now.getFullYear()}-${String(qMonth).padStart(2, '0')}`;
                return data.monthlyTrends.filter(t => t.monthKey >= cutoff);
            }
            case 'this-year':
                cutoff = `${now.getFullYear()}-01`;
                return data.monthlyTrends.filter(t => t.monthKey >= cutoff);
            default:
                return data.monthlyTrends;
        }
    }, [data.monthlyTrends, dateRange]);

    // Compute filtered KPIs from filtered trends
    const filteredKPIs = useMemo(() => {
        if (dateRange === 'all') {
            return {
                revenue: data.totalRevenue,
                cost: data.totalCost,
                production: data.totalProduction,
                salesBales: data.totalSalesBales,
            };
        }
        return {
            revenue: filteredTrends.reduce((s, t) => s + t.revenue, 0),
            cost: filteredTrends.reduce((s, t) => s + t.cost, 0),
            production: filteredTrends.reduce((s, t) => s + t.production, 0),
            salesBales: filteredTrends.reduce((s, t) => s + t.salesBales, 0),
        };
    }, [data, dateRange, filteredTrends]);

    const netPL = filteredKPIs.revenue - filteredKPIs.cost;

    const dateRangeOptions: { value: DateRange; label: string }[] = [
        { value: 'this-month', label: 'This Month' },
        { value: 'last-30', label: 'Last 30 Days' },
        { value: 'this-quarter', label: 'This Quarter' },
        { value: 'this-year', label: 'This Year' },
        { value: 'all', label: 'All Time' },
    ];

    // Custom Recharts tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload) return null;
        return (
            <div className="glass-card !p-3 !rounded-xl" style={{ border: '1px solid var(--glass-border)' }}>
                <p className="text-xs font-bold mb-1" style={{ color: 'var(--text-main)' }}>{label}</p>
                {payload.map((p: any, i: number) => (
                    <p key={i} className="text-xs" style={{ color: p.color }}>
                        {p.name}: {p.name.includes('$') || p.dataKey === 'revenue' || p.dataKey === 'cost'
                            ? formatCurrency(p.value)
                            : formatNumber(p.value)}
                    </p>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header + Date Filter */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-xl font-bold" style={{ color: 'var(--accent)' }}>
                    Financial Reports
                </h1>
                <div className="flex gap-1.5 flex-wrap">
                    {dateRangeOptions.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setDateRange(opt.value)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={{
                                background: dateRange === opt.value ? 'var(--primary)' : 'var(--bg-surface)',
                                color: dateRange === opt.value ? 'white' : 'var(--text-dim)',
                                border: `1px solid ${dateRange === opt.value ? 'var(--primary)' : 'var(--glass-border)'}`,
                            }}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ========== KPI Strip ========== */}
            <div className="grid grid-cols-2 gap-3">
                <div className="glass-card py-4 px-5">
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign size={14} style={{ color: 'var(--primary-light)' }} />
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Revenue</span>
                    </div>
                    <div className="text-2xl font-extrabold" style={{ color: 'var(--primary-light)' }}>
                        {formatCurrency(filteredKPIs.revenue)}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                        {formatNumber(filteredKPIs.salesBales)} bales sold
                    </p>
                </div>

                <div className="glass-card py-4 px-5">
                    <div className="flex items-center gap-2 mb-1">
                        <Package size={14} style={{ color: '#facc15' }} />
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Cost</span>
                    </div>
                    <div className="text-2xl font-extrabold" style={{ color: '#facc15' }}>
                        {formatCurrency(filteredKPIs.cost)}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                        Purchases
                    </p>
                </div>

                <div className="glass-card py-4 px-5" style={{ borderWidth: '2px', borderColor: netPL >= 0 ? 'var(--primary)' : '#ef4444' }}>
                    <div className="flex items-center gap-2 mb-1">
                        {netPL >= 0
                            ? <TrendingUp size={14} style={{ color: 'var(--primary-light)' }} />
                            : <TrendingDown size={14} style={{ color: '#ef4444' }} />}
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Net P&L</span>
                    </div>
                    <div className="text-2xl font-extrabold" style={{ color: netPL >= 0 ? 'var(--primary-light)' : '#ef4444' }}>
                        {netPL >= 0 ? '+' : ''}{formatCurrency(netPL)}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                        Revenue − Costs
                    </p>
                </div>

                <div className="glass-card py-4 px-5">
                    <div className="flex items-center gap-2 mb-1">
                        <BarChart3 size={14} style={{ color: 'var(--accent)' }} />
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Production</span>
                    </div>
                    <div className="text-2xl font-extrabold" style={{ color: 'var(--accent)' }}>
                        {formatNumber(filteredKPIs.production)}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                        Bales produced
                    </p>
                </div>
            </div>

            {/* ========== Revenue Over Time ========== */}
            {filteredTrends.length > 0 && (
                <div className="glass-card py-5 px-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar size={16} style={{ color: 'var(--accent)' }} />
                        <h2 className="text-base font-bold" style={{ color: 'var(--accent)' }}>Revenue & Cost Over Time</h2>
                    </div>
                    <div style={{ width: '100%', height: 280 }}>
                        <ResponsiveContainer>
                            <AreaChart data={filteredTrends} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#facc15" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#facc15" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} />
                                <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11, fill: 'var(--text-dim)' }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#4ade80" fill="url(#gradRevenue)" strokeWidth={2} />
                                <Area type="monotone" dataKey="cost" name="Cost" stroke="#facc15" fill="url(#gradCost)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* ========== Production Over Time ========== */}
            {filteredTrends.length > 0 && (
                <div className="glass-card py-5 px-6">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 size={16} style={{ color: 'var(--accent)' }} />
                        <h2 className="text-base font-bold" style={{ color: 'var(--accent)' }}>Monthly Activity (Bales)</h2>
                    </div>
                    <div style={{ width: '100%', height: 260 }}>
                        <ResponsiveContainer>
                            <BarChart data={filteredTrends} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} />
                                <YAxis tick={{ fontSize: 11, fill: 'var(--text-dim)' }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="production" name="Production" fill="#4ade80" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="purchaseBales" name="Purchases" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="salesBales" name="Sales" fill="#f472b6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* ========== Two-column: Inventory Snapshot + Commodity Revenue ========== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Inventory Snapshot */}
                {data.stockByCommodity.length > 0 && (
                    <div className="glass-card py-5 px-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Package size={16} style={{ color: 'var(--accent)' }} />
                            <h2 className="text-base font-bold" style={{ color: 'var(--accent)' }}>Current Inventory</h2>
                        </div>
                        <div style={{ width: '100%', height: Math.max(180, data.stockByCommodity.length * 50) }}>
                            <ResponsiveContainer>
                                <BarChart data={data.stockByCommodity} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                    <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-dim)' }}
                                        tickFormatter={(v: number) => `${v.toFixed(0)}t`} />
                                    <YAxis type="category" dataKey="commodity" tick={{ fontSize: 12, fill: 'var(--text-main)' }} width={90} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="tons" name="Tons" fill="#4ade80" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Commodity Revenue Donut */}
                {data.revenueByCommodity.length > 0 && (
                    <div className="glass-card py-5 px-6">
                        <div className="flex items-center gap-2 mb-4">
                            <DollarSign size={16} style={{ color: 'var(--accent)' }} />
                            <h2 className="text-base font-bold" style={{ color: 'var(--accent)' }}>Revenue by Commodity</h2>
                        </div>
                        <div style={{ width: '100%', height: 240 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={data.revenueByCommodity}
                                        dataKey="revenue"
                                        nameKey="commodity"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={90}
                                        paddingAngle={3}
                                        strokeWidth={0}
                                    >
                                        {data.revenueByCommodity.map((_, index) => (
                                            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(val: number | undefined) => val != null ? formatCurrency(val) : ''} />
                                    <Legend
                                        formatter={(value: string) => (
                                            <span style={{ color: 'var(--text-main)', fontSize: '12px' }}>{value}</span>
                                        )}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>

            {/* ========== Top Buyers & Sellers ========== */}
            {data.topEntities.length > 0 && (
                <div className="glass-card py-5 px-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Users size={16} style={{ color: 'var(--accent)' }} />
                        <h2 className="text-base font-bold" style={{ color: 'var(--accent)' }}>Top Buyers & Sellers</h2>
                    </div>

                    {/* Buyers */}
                    {data.topEntities.filter(e => e.type === 'buyer').length > 0 && (
                        <>
                            <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--primary-light)' }}>
                                Buyers
                            </h3>
                            <div className="space-y-2 mb-4">
                                {data.topEntities.filter(e => e.type === 'buyer').map((entity, i) => {
                                    const maxRev = Math.max(...data.topEntities.filter(e => e.type === 'buyer').map(e => e.revenue));
                                    const barWidth = maxRev > 0 ? (entity.revenue / maxRev) * 100 : 0;
                                    return (
                                        <div key={`buyer-${i}`} className="relative">
                                            <div
                                                className="absolute inset-0 rounded-lg opacity-15"
                                                style={{
                                                    background: 'var(--primary)',
                                                    width: `${barWidth}%`,
                                                }}
                                            />
                                            <div className="relative flex items-center justify-between py-2 px-3">
                                                <div>
                                                    <span className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>
                                                        {entity.entity}
                                                    </span>
                                                    <span className="text-xs ml-2" style={{ color: 'var(--text-dim)' }}>
                                                        {formatNumber(entity.bales)} bales • {entity.transactions} txns
                                                    </span>
                                                </div>
                                                <span className="font-bold text-sm" style={{ color: 'var(--primary-light)' }}>
                                                    {formatCurrency(entity.revenue)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* Sellers */}
                    {data.topEntities.filter(e => e.type === 'seller').length > 0 && (
                        <>
                            <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#facc15' }}>
                                Sellers / Suppliers
                            </h3>
                            <div className="space-y-2">
                                {data.topEntities.filter(e => e.type === 'seller').map((entity, i) => {
                                    const maxRev = Math.max(...data.topEntities.filter(e => e.type === 'seller').map(e => e.revenue));
                                    const barWidth = maxRev > 0 ? (entity.revenue / maxRev) * 100 : 0;
                                    return (
                                        <div key={`seller-${i}`} className="relative">
                                            <div
                                                className="absolute inset-0 rounded-lg opacity-15"
                                                style={{
                                                    background: '#facc15',
                                                    width: `${barWidth}%`,
                                                }}
                                            />
                                            <div className="relative flex items-center justify-between py-2 px-3">
                                                <div>
                                                    <span className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>
                                                        {entity.entity}
                                                    </span>
                                                    <span className="text-xs ml-2" style={{ color: 'var(--text-dim)' }}>
                                                        {formatNumber(entity.bales)} bales • {entity.transactions} txns
                                                    </span>
                                                </div>
                                                <span className="font-bold text-sm" style={{ color: '#facc15' }}>
                                                    {formatCurrency(entity.revenue)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ========== Location Utilization ========== */}
            {data.locationUtilization.length > 0 && (
                <div className="glass-card py-5 px-6">
                    <div className="flex items-center gap-2 mb-4">
                        <MapPin size={16} style={{ color: 'var(--accent)' }} />
                        <h2 className="text-base font-bold" style={{ color: 'var(--accent)' }}>Location Utilization</h2>
                    </div>
                    <div className="space-y-3">
                        {data.locationUtilization.map((loc) => {
                            const pct = loc.capacity > 0 ? Math.min((loc.used / loc.capacity) * 100, 100) : 0;
                            const isHigh = pct > 85;
                            return (
                                <div key={loc.name}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>
                                            {loc.name}
                                        </span>
                                        <span className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                                            {formatNumber(loc.used)} / {formatNumber(loc.capacity)} {loc.unit}
                                            <span className="ml-1 font-bold" style={{ color: isHigh ? '#ef4444' : 'var(--primary-light)' }}>
                                                ({pct.toFixed(0)}%)
                                            </span>
                                        </span>
                                    </div>
                                    <div className="w-full rounded-full h-2.5" style={{ background: 'var(--bg-deep)' }}>
                                        <div
                                            className="h-2.5 rounded-full transition-all"
                                            style={{
                                                width: `${pct}%`,
                                                background: isHigh
                                                    ? 'linear-gradient(90deg, #ef4444, #f87171)'
                                                    : 'linear-gradient(90deg, var(--primary), var(--primary-light))',
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ========== Monthly Activity Table ========== */}
            {filteredTrends.length > 0 && (
                <div className="glass-card py-5 px-6 overflow-x-auto">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar size={16} style={{ color: 'var(--accent)' }} />
                        <h2 className="text-base font-bold" style={{ color: 'var(--accent)' }}>Monthly Breakdown</h2>
                    </div>
                    <table className="w-full text-sm" style={{ minWidth: 500 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                <th className="text-left py-2 font-bold" style={{ color: 'var(--text-dim)' }}>Month</th>
                                <th className="text-right py-2 font-bold" style={{ color: '#4ade80' }}>Production</th>
                                <th className="text-right py-2 font-bold" style={{ color: '#60a5fa' }}>Purchases</th>
                                <th className="text-right py-2 font-bold" style={{ color: '#f472b6' }}>Sales</th>
                                <th className="text-right py-2 font-bold" style={{ color: 'var(--primary-light)' }}>Revenue</th>
                                <th className="text-right py-2 font-bold" style={{ color: '#facc15' }}>Cost</th>
                                <th className="text-right py-2 font-bold" style={{ color: 'var(--text-main)' }}>Net</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...filteredTrends].reverse().map((row) => {
                                const net = row.revenue - row.cost;
                                return (
                                    <tr key={row.monthKey} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                        <td className="py-2 font-medium" style={{ color: 'var(--text-main)' }}>{row.month}</td>
                                        <td className="text-right py-2" style={{ color: '#4ade80' }}>{formatNumber(row.production)}</td>
                                        <td className="text-right py-2" style={{ color: '#60a5fa' }}>{formatNumber(row.purchaseBales)}</td>
                                        <td className="text-right py-2" style={{ color: '#f472b6' }}>{formatNumber(row.salesBales)}</td>
                                        <td className="text-right py-2" style={{ color: 'var(--primary-light)' }}>{formatCurrency(row.revenue)}</td>
                                        <td className="text-right py-2" style={{ color: '#facc15' }}>{formatCurrency(row.cost)}</td>
                                        <td className="text-right py-2 font-bold" style={{ color: net >= 0 ? 'var(--primary-light)' : '#ef4444' }}>
                                            {net >= 0 ? '+' : ''}{formatCurrency(net)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        {/* Totals row */}
                        <tfoot>
                            <tr style={{ borderTop: '2px solid var(--glass-border)' }}>
                                <td className="py-2 font-bold" style={{ color: 'var(--accent)' }}>Total</td>
                                <td className="text-right py-2 font-bold" style={{ color: '#4ade80' }}>
                                    {formatNumber(filteredTrends.reduce((s, t) => s + t.production, 0))}
                                </td>
                                <td className="text-right py-2 font-bold" style={{ color: '#60a5fa' }}>
                                    {formatNumber(filteredTrends.reduce((s, t) => s + t.purchaseBales, 0))}
                                </td>
                                <td className="text-right py-2 font-bold" style={{ color: '#f472b6' }}>
                                    {formatNumber(filteredTrends.reduce((s, t) => s + t.salesBales, 0))}
                                </td>
                                <td className="text-right py-2 font-bold" style={{ color: 'var(--primary-light)' }}>
                                    {formatCurrency(filteredKPIs.revenue)}
                                </td>
                                <td className="text-right py-2 font-bold" style={{ color: '#facc15' }}>
                                    {formatCurrency(filteredKPIs.cost)}
                                </td>
                                <td className="text-right py-2 font-bold" style={{ color: netPL >= 0 ? 'var(--primary-light)' : '#ef4444' }}>
                                    {netPL >= 0 ? '+' : ''}{formatCurrency(netPL)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}

            {/* Empty state */}
            {data.monthlyTrends.length === 0 && data.stockByCommodity.length === 0 && (
                <div className="glass-card py-12 text-center" style={{ color: 'var(--text-dim)' }}>
                    <BarChart3 size={48} className="mx-auto mb-4 opacity-40" />
                    <p className="text-lg font-bold">No data yet</p>
                    <p className="text-sm mt-1">Start logging transactions to see your reports come to life.</p>
                </div>
            )}
        </div>
    );
}
