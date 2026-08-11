import { useState, useEffect, useCallback } from 'react';
import { dashboardAPI } from '../utils/api';

const STAFF_ROLES = ['admin', 'engineer', 'project_manager', 'finance_officer'];

/**
 * Fetch live dashboard data once per role.
 *  - Staff roles: full /api/dashboard/stats feed (feeds every chart).
 *  - Contractors: /api/dashboard/my-dashboard (role-scoped view).
 */
export const useDashboardStats = (userRole) => {
  const isStaffRole = STAFF_ROLES.includes(userRole);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = isStaffRole
        ? await dashboardAPI.getStats()
        : await dashboardAPI.getMyDashboard();
      setStats(data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [isStaffRole]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, isStaffRole, refetch: fetchStats };
};