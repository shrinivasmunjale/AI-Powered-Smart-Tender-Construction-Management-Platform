import React, { useState, useEffect } from 'react';
import { FileText, Users, DollarSign, TrendingUp, Wallet, ShieldCheck } from 'lucide-react';
import { StatCard } from '../common/Card';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { dashboardAPI } from '../../utils/api';

const STAFF_ROLES = ['admin', 'engineer', 'project_manager', 'finance_officer'];

/**
 * KPI stat cards fed from live API data.
 * Accepts a pre-fetched `stats` payload; otherwise it fetches the
 * role-appropriate endpoint itself.
 */
export const DashboardStats = ({ userRole, stats: propStats }) => {
  const [stats, setStats] = useState(propStats || null);
  const [loading, setLoading] = useState(!propStats);

  useEffect(() => {
    if (propStats) {
      setStats(propStats);
      return;
    }

    const fetchStats = async () => {
      try {
        const data = STAFF_ROLES.includes(userRole)
          ? await dashboardAPI.getStats()
          : await dashboardAPI.getMyDashboard();
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userRole, propStats]);

  if (loading) {
    return (
      <div className="stats-grid">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="stat-card skeleton" style={{ height: '120px' }} />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  // Staff / admin stats (payload from GET /api/dashboard/stats)
  if (STAFF_ROLES.includes(userRole)) {
    const tenders = stats.tenders || {};
    const contractors = stats.contractors || {};
    const finance = stats.finance || {};
    const projects = stats.projects || {};
    const payments = stats.payments || {};

    return (
      <div className="stats-grid">
        <StatCard
          icon={<FileText size={20} />}
          iconColor="primary"
          title="Total Tenders"
          value={tenders.total || 0}
          subtitle={`${tenders.active || 0} active`}
        />
        <StatCard
          icon={<Users size={20} />}
          iconColor="success"
          title="Verified Contractors"
          value={contractors.verified || 0}
          subtitle={`${contractors.pending || 0} pending`}
        />
        <StatCard
          icon={<DollarSign size={20} />}
          iconColor="warning"
          title="Total Budget"
          value={formatCurrency(finance.totalBudget)}
          subtitle={`Utilization ${formatPercent(Number(finance.budgetUtilization) || 0)}`}
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          iconColor="info"
          title="Active Projects"
          value={projects.ongoing || 0}
          subtitle={`${projects.completed || 0} completed`}
        />
        <StatCard
          icon={<Wallet size={20} />}
          iconColor="warning"
          title="Payments Pending"
          value={payments.pending || 0}
          subtitle={`${payments.released || 0} released`}
        />
        <StatCard
          icon={<ShieldCheck size={20} />}
          iconColor="success"
          title="Budget Savings"
          value={formatCurrency(finance.savings)}
          subtitle="Across all projects"
        />
      </div>
    );
  }

  // Contractor stats (payload from GET /api/dashboard/my-dashboard)
  const contractor = stats.contractor || {};
  const acceptedBids = stats.recentBids?.filter(b => b.status === 'accepted').length || 0;
  const winRate = stats.myBids > 0 ? Math.round((acceptedBids / stats.myBids) * 100) : 0;

  return (
    <div className="stats-grid">
      <StatCard
        icon={<FileText size={20} />}
        iconColor="primary"
        title="My Bids"
        value={stats.myBids || 0}
        subtitle={`${stats.recentBids?.length || 0} recent submissions`}
      />
      <StatCard
        icon={<TrendingUp size={20} />}
        iconColor="success"
        title="Win Rate"
        value={`${winRate}%`}
        subtitle={`${acceptedBids} accepted`}
      />
      <StatCard
        icon={<Wallet size={20} />}
        iconColor="warning"
        title="Pending Payments"
        value={stats.pendingPayments || 0}
        subtitle="Awaiting approval"
      />
      <StatCard
        icon={<ShieldCheck size={20} />}
        iconColor="info"
        title="Verification"
        value={contractor.verificationStatus || '—'}
        subtitle={contractor.companyName || stats.user?.email || ''}
      />
    </div>
  );
};