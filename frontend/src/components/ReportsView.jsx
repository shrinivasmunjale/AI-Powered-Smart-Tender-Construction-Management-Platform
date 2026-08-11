import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from 'recharts';
import {
  Download, FileText, Users, DollarSign, TrendingUp,
  Loader2, ClipboardCheck, Package, BarChart2,
  Building2, CheckCircle2, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { dashboardAPI, projectsAPI, paymentsAPI, materialsAPI, inspectionsAPI } from '../utils/api';
import { StatCard, Card } from './common/Card';
import { Button } from './common/Button';
import { Badge } from './common/Badge';
import { EmptyState } from './common/EmptyState';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import {
  transformTenderTrend,
  transformBudgetByCategory,
  transformCategoryDistribution,
} from '../utils/dashboardData';

/* ─── palette / tooltip shared config ──────────────────────────────────── */
const PIE_COLORS = [
  'var(--primary)', 'var(--success)', 'var(--warning)',
  'var(--danger)', '#818cf8',
];

const TOOLTIP_STYLE = {
  background: 'var(--bg-panel-solid)',
  border: '1px solid var(--border-light)',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'var(--text-bright)',
};

const axisStyle = { fill: 'var(--text-muted)', fontSize: 11 };

/* ─── small helpers ─────────────────────────────────────────────────────── */
const SectionHeader = ({ title, subtitle }) => (
  <div style={{ marginBottom: '20px' }}>
    <h2 style={{
      margin: 0, fontSize: '18px', fontWeight: 700,
      color: 'var(--app-text-primary)', fontFamily: 'var(--font-display)',
    }}>
      {title}
    </h2>
    {subtitle && (
      <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
        {subtitle}
      </p>
    )}
  </div>
);

const Divider = () => (
  <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '32px 0' }} />
);

const ChartEmpty = ({ label }) => (
  <EmptyState
    icon={<BarChart2 size={28} />}
    title={`No ${label} data yet`}
    description="Data will appear once records exist in the system."
  />
);

/* ─── action → badge variant map ───────────────────────────────────────── */
const actionVariant = (action = '') => {
  const a = action.toUpperCase();
  if (a.includes('CREATE') || a.includes('REGISTER')) return 'success';
  if (a.includes('DELETE') || a.includes('REJECT'))   return 'danger';
  if (a.includes('APPROVE') || a.includes('AWARD'))   return 'warning';
  if (a.includes('LOGIN') || a.includes('CHAT'))      return 'info';
  return 'default';
};

/* ─── main component ────────────────────────────────────────────────────── */
/**
 * Reports & Analytics — aggregates every domain stats endpoint into one view
 * with charts and CSV export.  Role restrictions are respected: a 403 on a
 * stats sub-section simply hides it gracefully.
 */
export const ReportsView = ({ userRole }) => {
  const [data, setData]       = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  /* ── fetch all stat endpoints in parallel ─────────────────────────── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    const settled = await Promise.allSettled([
      dashboardAPI.getStats(),       // 0
      projectsAPI.getStats(),        // 1
      paymentsAPI.getStats(),        // 2
      materialsAPI.getStats(),       // 3
      inspectionsAPI.getStats(),     // 4
    ]);
    const pick = (i) => (settled[i]?.status === 'fulfilled' ? settled[i].value : null);
    setData({
      dashboard:   pick(0),
      projects:    pick(1),
      payments:    pick(2),
      materials:   pick(3),
      inspections: pick(4),
    });
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── derive chart-friendly shapes ────────────────────────────────── */
  const dashboard = data.dashboard || {};

  const tenderTrend    = useMemo(() => transformTenderTrend(dashboard.monthlyTenders),          [dashboard.monthlyTenders]);
  const budgetData     = useMemo(() => transformBudgetByCategory(dashboard.budgetByCategory),   [dashboard.budgetByCategory]);
  const categoryData   = useMemo(() => transformCategoryDistribution(dashboard.categoryDistribution), [dashboard.categoryDistribution]);

  const paymentStatusData = useMemo(() => {
    const p = dashboard.payments || {};
    return [
      { name: 'Pending',        value: p.pending  || 0 },
      { name: 'Eng. Approved',  value: p.approved || 0 },
      { name: 'Released',       value: p.released || 0 },
      { name: 'Rejected',       value: p.rejected || 0 },
    ].filter(d => d.value > 0);
  }, [dashboard.payments]);

  const inspectionStatusData = useMemo(() => {
    const ins = dashboard.inspections || {};
    return [
      { name: 'Passed',      value: ins.passed  || 0 },
      { name: 'Failed',      value: ins.failed  || 0 },
      { name: 'Needs Review',value: ins.pending || 0 },
    ].filter(d => d.value > 0);
  }, [dashboard.inspections]);

  const activities = useMemo(() => dashboard.recentActivities || [], [dashboard.recentActivities]);

  /* ── CSV export ──────────────────────────────────────────────────── */
  const exportCsv = () => {
    const rows = activities.map(a => [
      a.action,
      a.entityType || '',
      a.entityId ?? '',
      a.user?.email || '',
      a.user?.role  || '',
      formatDateTime(a.timestamp),
    ]);
    const header = ['Action', 'Entity Type', 'Entity ID', 'User Email', 'Role', 'Timestamp'];
    const csv = [header, ...rows]
      .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `tenderbridge-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /* ── loading / error guards ──────────────────────────────────────── */
  if (loading) {
    return (
      <EmptyState
        icon={<Loader2 size={32} className="spin" />}
        title="Compiling reports…"
        description="Fetching data from all modules."
      />
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<AlertTriangle size={32} />}
        title="Failed to load reports"
        description={error}
      />
    );
  }

  /* shorthand refs */
  const t    = dashboard.tenders     || {};
  const c    = dashboard.contractors || {};
  const p    = dashboard.projects    || {};
  const pay  = dashboard.payments    || {};
  const mat  = dashboard.materials   || {};
  const ins  = dashboard.inspections || {};
  const fin  = dashboard.finance     || {};

  /* ── render ──────────────────────────────────────────────────────── */
  return (
    <div>
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: '32px', color: 'var(--app-text-primary)' }}>
            Reports &amp; Analytics
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
            Platform-wide summary across all modules · Generated {new Date().toLocaleString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" icon={<RefreshCw size={15} />} onClick={fetchAll}>
            Refresh
          </Button>
          <Button variant="primary" icon={<Download size={15} />} onClick={exportCsv}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1 — KPI Overview
      ═══════════════════════════════════════════════════════════════ */}
      <SectionHeader title="Platform Overview" subtitle="Live counts from every module" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <StatCard icon={<FileText size={20} />}    iconColor="primary"  title="Total Tenders"      value={t.total      ?? '—'} subtitle={`${t.active ?? 0} active`} />
        <StatCard icon={<Users size={20} />}        iconColor="success"  title="Contractors"        value={c.total      ?? '—'} subtitle={`${c.verified ?? 0} verified`} />
        <StatCard icon={<Building2 size={20} />}   iconColor="warning"  title="Projects"           value={p.total      ?? '—'} subtitle={`${p.ongoing  ?? 0} ongoing`} />
        <StatCard icon={<DollarSign size={20} />}  iconColor="primary"  title="Payments Released"  value={pay.released ?? '—'} subtitle={formatCurrency(pay.totalReleased)} />
        <StatCard icon={<Package size={20} />}     iconColor="info"     title="Materials"          value={mat.total    ?? '—'} subtitle={mat.lowStockAlerts ? `⚠ ${mat.lowStockAlerts} low stock` : 'Stock OK'} />
        <StatCard icon={<ClipboardCheck size={20}/>}iconColor="success" title="Inspections"        value={ins.total    ?? '—'} subtitle={`${ins.passed ?? 0} passed`} />
        <StatCard icon={<CheckCircle2 size={20} />}iconColor="success"  title="Budget Utilisation" value={`${fin.budgetUtilization ?? 0}%`} subtitle={`Savings: ${formatCurrency(fin.savings)}`} />
        <StatCard icon={<TrendingUp size={20} />}  iconColor="warning"  title="Bids Submitted"     value={dashboard.bids?.total ?? '—'} subtitle={`${dashboard.bids?.accepted ?? 0} accepted`} />
      </div>

      <Divider />

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2 — Tender & Category Charts
      ═══════════════════════════════════════════════════════════════ */}
      <SectionHeader title="Tender Analytics" subtitle="Activity trends and category distribution" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px', marginBottom: '32px' }}>

        {/* Tender Trend — Area chart */}
        <Card title="Tender Activity (6 Months)" icon={<TrendingUp size={16} />}>
          {tenderTrend.length === 0 ? <ChartEmpty label="tender trend" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={tenderTrend} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="tenderGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey="month" tick={axisStyle} />
                <YAxis tick={axisStyle} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="published" name="Published" stroke="var(--primary)" fill="url(#tenderGrad)" strokeWidth={2} dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Category Distribution — Pie */}
        <Card title="Category Distribution" icon={<BarChart2 size={16} />}>
          {categoryData.length === 0 ? <ChartEmpty label="category" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Divider />

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3 — Finance & Payments
      ═══════════════════════════════════════════════════════════════ */}
      <SectionHeader title="Finance & Payments" subtitle="Budget utilisation and payment pipeline status" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px', marginBottom: '32px' }}>

        {/* Budget vs Actual — grouped bar */}
        <Card title="Budget vs Actual (by Department)" icon={<DollarSign size={16} />}>
          {budgetData.length === 0 ? <ChartEmpty label="budget" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={budgetData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey="category" tick={axisStyle} />
                <YAxis tick={axisStyle} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }} />
                <Bar dataKey="estimated" name="Estimated" fill="var(--primary)"  radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual"    name="Actual"    fill="var(--success)"  radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Payment Status — donut */}
        <Card title="Payment Pipeline Status" icon={<DollarSign size={16} />}>
          {paymentStatusData.length === 0 ? <ChartEmpty label="payment status" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={paymentStatusData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                >
                  {paymentStatusData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Finance summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '32px' }}>
        {[
          { label: 'Total Budget',     val: formatCurrency(fin.totalBudget) },
          { label: 'Actual Cost',      val: formatCurrency(fin.totalActualCost) },
          { label: 'Savings',          val: formatCurrency(fin.savings) },
          { label: 'GST Collected',    val: formatCurrency(pay.totalTax) },
          { label: 'Total Released',   val: formatCurrency(pay.totalReleased) },
        ].map(({ label, val }) => (
          <div key={label} style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-light)',
            borderRadius: '10px',
            padding: '14px 16px',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-bright)' }}>{val || '—'}</div>
          </div>
        ))}
      </div>

      <Divider />

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4 — Inspections
      ═══════════════════════════════════════════════════════════════ */}
      <SectionHeader title="Site Inspections" subtitle="Inspection pass/fail breakdown" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px', marginBottom: '32px' }}>

        <Card title="Inspection Status Breakdown" icon={<ClipboardCheck size={16} />}>
          {inspectionStatusData.length === 0 ? <ChartEmpty label="inspection" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={inspectionStatusData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {inspectionStatusData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Inspection quick stats */}
        <Card title="Inspection Summary" icon={<ClipboardCheck size={16} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '4px 0' }}>
            {[
              { label: 'Total Inspections', val: ins.total  ?? '—', color: 'var(--primary)' },
              { label: 'Passed',            val: ins.passed ?? '—', color: 'var(--success)' },
              { label: 'Failed',            val: ins.failed ?? '—', color: 'var(--danger)' },
              { label: 'Needs Review',      val: ins.pending?? '—', color: 'var(--warning)' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-panel)', borderRadius: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color }}>{val}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Divider />

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 5 — Recent Audit Activity Log
      ═══════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <SectionHeader title="Recent System Activity" subtitle="Last 10 audit log entries" />
        <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportCsv}>
          Download CSV
        </Button>
      </div>

      <Card>
        {activities.length === 0 ? (
          <EmptyState icon={<FileText size={28} />} title="No activity yet" description="Audit events will appear here as users interact with the system." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                  {['Action', 'Entity', 'User', 'Role', 'Timestamp'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activities.map((a, idx) => (
                  <tr key={a.id ?? idx} style={{
                    borderBottom: '1px solid var(--border-light)',
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(253,241,225,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <Badge variant={actionVariant(a.action)} style={{ fontSize: '11px' }}>
                        {(a.action || 'UNKNOWN').replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                      {a.entityType ? `${a.entityType} #${a.entityId ?? ''}` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-bright)' }}>
                      {a.user?.email || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                      {a.user?.role || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDateTime(a.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};