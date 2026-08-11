import React from 'react';
import { HardHat } from 'lucide-react';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { Loading } from '../common/Loading';
import { DashboardStats } from './DashboardStats';
import { TenderChart } from './TenderChart';
import { BudgetChart } from './BudgetChart';
import { CategoryPieChart } from './CategoryPieChart';
import { RecentActivity } from './RecentActivity';
import { UpcomingDeadlines } from './UpcomingDeadlines';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import {
  transformTenderTrend,
  transformBudgetByCategory,
  transformCategoryDistribution,
  transformUpcomingDeadlines,
  transformRecentActivities,
  transformRecentBids,
} from '../../utils/dashboardData';

const ChartOrEmpty = ({ items, title, EmptyIcon, children }) => {
  if (!items || items.length === 0) {
    return (
      <EmptyState
        icon={<EmptyIcon size={32} />}
        title={`No ${title} yet`}
        description="Data will appear here once records exist."
      />
    );
  }
  return children;
};

/**
 * The dashboard home view. Fetches live stats and feeds every chart from them.
 */
export const DashboardHome = ({ userRole }) => {
  const { stats, loading, error, isStaffRole } = useDashboardStats(userRole);

  if (loading) {
    return <Loading text="Loading dashboard..." />;
  }

  if (error || !stats) {
    return (
      <EmptyState
        icon={<HardHat size={32} />}
        title="Could not load dashboard data"
        description={error?.message || 'The dashboard API did not return data.'}
      />
    );
  }

  // === Contractor dashboard ===
  if (!isStaffRole) {
    const activities = transformRecentBids(stats.recentBids);
    return (
      <div>
        <DashboardStats userRole={userRole} stats={stats} />
        <div style={{ marginTop: '24px' }}>
          <Card title="My Recent Bids" icon={null}>
            <ChartOrEmpty items={activities} title="bids yet" EmptyIcon={HardHat}>
              <RecentActivity activities={activities} />
            </ChartOrEmpty>
          </Card>
        </div>
      </div>
    );
  }

  // === Staff / admin dashboard ===
  const tenderTrend = transformTenderTrend(stats.monthlyTenders);
  const budgetData = transformBudgetByCategory(stats.budgetByCategory);
  const categoryData = transformCategoryDistribution(stats.categoryDistribution);
  const activities = transformRecentActivities(stats.recentActivities);
  const deadlines = transformUpcomingDeadlines(stats.upcomingDeadlines);

  return (
    <div>
      <DashboardStats userRole={userRole} stats={stats} />

      <div className="dashboard-charts-grid">
        <Card title="Tender Activity (6 Months)" icon={null}>
          <ChartOrEmpty items={tenderTrend} title="tender activity" EmptyIcon={HardHat}>
            <TenderChart data={tenderTrend} />
          </ChartOrEmpty>
        </Card>
        <Card title="Budget vs Actual (by Department)" icon={null}>
          <ChartOrEmpty items={budgetData} title="budget data" EmptyIcon={HardHat}>
            <BudgetChart data={budgetData} />
          </ChartOrEmpty>
        </Card>
        <Card title="Category Distribution" icon={null}>
          <ChartOrEmpty items={categoryData} title="categories" EmptyIcon={HardHat}>
            <CategoryPieChart data={categoryData} />
          </ChartOrEmpty>
        </Card>
        <Card title="Recent Activity" icon={null}>
          <ChartOrEmpty items={activities} title="recent activity" EmptyIcon={HardHat}>
            <RecentActivity activities={activities} />
          </ChartOrEmpty>
        </Card>
      </div>

      <div style={{ marginTop: '24px' }}>
        <Card title="Upcoming Deadlines" icon={null}>
          <ChartOrEmpty items={deadlines} title="upcoming deadlines" EmptyIcon={HardHat}>
            <UpcomingDeadlines deadlines={deadlines} />
          </ChartOrEmpty>
        </Card>
      </div>
    </div>
  );
};