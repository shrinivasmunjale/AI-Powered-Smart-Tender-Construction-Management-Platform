import React, { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Sidebar } from './layout/Sidebar';
import { TopBar } from './layout/TopBar';
import { useAuth } from '../contexts/AuthContext';
import { DashboardHome } from './dashboard/DashboardHome';
import { ProjectsView } from './ProjectsView';
import { PaymentsView } from './PaymentsView';
import { MaterialsView } from './MaterialsView';
import { InspectionsView } from './InspectionsView';
import { ReportsView } from './ReportsView';
import { AIChatView } from './AIChatView';

// Existing dashboards
import AdminDashboard from './AdminDashboard';
import ContractorDashboard from './ContractorDashboard';
import NotificationLogger from './NotificationLogger';

/**
 * The portal shell. The active view is derived from the URL (/portal/:view),
 * so navigation produces real, shareable routes. Unauthenticated visitors are
 * redirected to /login.
 */
export const EnhancedDashboard = () => {
  const { view = 'dashboard' } = useParams();
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <DashboardHome userRole={user?.role} />;

      case 'tenders':
        return user?.role === 'admin' ? (
          <AdminDashboard token={token} />
        ) : (
          <ContractorDashboard
            token={token}
            contractorStatus={user?.Contractor?.verificationStatus}
            companyName={user?.Contractor?.companyName}
            onStatusUpdate={() => {}}
          />
        );

      case 'contractors':
        return user?.role === 'admin' ? (
          <AdminDashboard token={token} />
        ) : (
          <DashboardHome userRole={user?.role} />
        );

      case 'projects':
        return <ProjectsView userRole={user?.role} />;

      case 'payments':
      case 'approvals':
        return <PaymentsView userRole={user?.role} />;

      case 'materials':
        return <MaterialsView userRole={user?.role} />;

      case 'inspections':
        return <InspectionsView userRole={user?.role} />;

      case 'reports':
        return <ReportsView userRole={user?.role} />;

      case 'ai-assistant':
        return <AIChatView userRole={user?.role} userEmail={user?.email} />;

      default:
        return (
          <div>
            <h2>{view}</h2>
            <p>This view is under construction...</p>
          </div>
        );
    }
  };

  return (
    <div className="app-layout">
      <TopBar
        onBackToLanding={() => navigate('/')}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <Sidebar userRole={user?.role || 'contractor'} collapsed={sidebarCollapsed} />

      <main className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {renderView()}
      </main>

      {/* Keep notification logger */}
      <NotificationLogger token={token} />
    </div>
  );
};