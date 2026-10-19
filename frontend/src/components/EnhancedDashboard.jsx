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
import { ProfileView } from './ProfileView';
import { AIChatBox } from './common/AIChatBox';

// Existing dashboards
import AdminDashboard from './AdminDashboard';
import ContractorDashboard from './ContractorDashboard';
import OrganizationDashboard from './OrganizationDashboard';
import NotificationLogger from './NotificationLogger';
import { ContractorsView } from './ContractorsView';
import { AdminTendersView } from './AdminTendersView';

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

      case 'authorizations':
        return <AdminDashboard token={token} />;

      case 'tenders':
        if (user?.role === 'admin') {
          return <AdminTendersView token={token} />;
        }
        if (user?.role === 'organization') {
          return <OrganizationDashboard token={token} />;
        }
        return (
          <ContractorDashboard
            token={token}
            userRole={user?.role}
            contractorStatus={user?.Contractor?.verificationStatus}
            companyName={user?.Contractor?.companyName}
            onStatusUpdate={() => {}}
          />
        );

      case 'contractors':
        return <ContractorsView userRole={user?.role} token={token} />;

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

      case 'profile':
        return <ProfileView />;

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

      {/* Floating omnipresent AI Chat assistant widget */}
      <AIChatBox />

      {/* Keep notification logger */}
      <NotificationLogger token={token} />
    </div>
  );
};