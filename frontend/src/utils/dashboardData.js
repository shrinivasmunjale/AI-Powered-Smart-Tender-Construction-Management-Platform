/**
 * Transform utilities: map the backend /api/dashboard/stats payload into the
 * shapes consumed by the Recharts-based dashboard components.
 */

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const daysUntil = (date) => {
  if (!date) return Infinity;
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};

/** "2026-01" -> "Jan 26" */
export const formatMonthLabel = (month) => {
  if (!month) return '';
  const [year, m] = String(month).split('-');
  const idx = parseInt(m, 10) - 1;
  if (Number.isNaN(idx) || idx < 0 || idx > 11) return month;
  return `${MONTH_ABBR[idx]} ${String(year).slice(2)}`;
};

/** [{ month: 'YYYY-MM', count }] -> [{ month: 'Jan 26', published }] */
export const transformTenderTrend = (monthlyTenders = []) =>
  monthlyTenders.map((mt) => ({
    month: formatMonthLabel(mt.month),
    published: Number(mt.count || 0),
  }));

/** [{ department, budget, actualCost }] -> [{ category, estimated, actual }] */
export const transformBudgetByCategory = (budgetByCategory = []) =>
  budgetByCategory.map((b) => ({
    category: b.department || 'Other',
    estimated: Number(b.budget || 0),
    actual: Number(b.actualCost || 0),
  }));

/** [{ category, count }] -> [{ name, value }] */
export const transformCategoryDistribution = (distribution = []) =>
  distribution.map((cd) => ({
    name: cd.category || 'Other',
    value: Number(cd.count || 0),
  }));

/** [{ id, title, category, deadline }] -> + urgent flag */
export const transformUpcomingDeadlines = (deadlines = []) =>
  deadlines.map((t) => ({
    id: t.id,
    title: t.title,
    category: t.category,
    deadline: t.deadline,
    urgent: daysUntil(t.deadline) <= 2,
  }));

const titleFromAction = (action = '') => {
  const readable = action.replace(/_/g, ' ').toLowerCase();
  return readable ? readable.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Activity';
};

const metaFromAction = (action = '') => {
  const a = String(action || '').toUpperCase();
  if (a.includes('TENDER')) return { type: 'tender', title: 'Tender activity' };
  if (a.includes('BID')) return { type: 'bid', title: 'Bid activity' };
  if (a.includes('CONTRACTOR')) return { type: 'contractor', title: 'Contractor activity' };
  if (a.includes('PAYMENT')) return { type: 'payment', title: 'Payment activity' };
  if (a.includes('PROJECT')) return { type: 'project', title: 'Project activity' };
  if (a.includes('INSPECTION')) return { type: 'inspection', title: 'Inspection activity' };
  if (a.includes('MATERIAL')) return { type: 'material', title: 'Material activity' };
  if (a.includes('LOGIN') || a.includes('REGISTER')) return { type: 'general', title: 'Account activity' };
  return { type: 'general', title: titleFromAction(action) };
};

/** [{ id, action, entityType, entityId, user, timestamp, details }] -> activity feed items */
export const transformRecentActivities = (activities = []) =>
  activities.map((a) => {
    const meta = metaFromAction(a.action);
    let description = '';

    if (a.details && typeof a.details === 'object') {
      description = Object.entries(a.details)
        .slice(0, 2)
        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join(' • ');
    }
    if (!description && a.user) {
      description = `by ${a.user.email || 'user'} (${a.user.role || 'user'})`;
    }
    if (!description && a.entityType) {
      description = `${a.entityType} #${a.entityId ?? ''}`.trim();
    }

    return {
      id: a.id,
      type: meta.type,
      title: meta.title,
      description,
      timestamp: a.timestamp,
    };
  });

/** Contractor /my-dashboard recentBids -> activity feed items */
export const transformRecentBids = (recentBids = []) =>
  recentBids.map((b) => ({
    id: b.id,
    type: 'bid',
    title: `Bid on ${b.Tender?.title || 'tender'}`,
    description: `${b.status ? b.status.replace(/_/g, ' ') : 'submitted'} · ${Number(b.price || 0).toLocaleString()} ${b.Tender?.category ? `· ${b.Tender.category}` : ''}`,
    timestamp: b.createdAt,
  }));