import React from 'react';
import { Bell, LogOut, Menu, ArrowLeft } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../../contexts/AuthContext';
import { getInitials } from '../../utils/formatters';

export const TopBar = ({ onBackToLanding, onToggleSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button 
          className="topbar-menu-btn"
          onClick={onToggleSidebar}
          title="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
        <div className="topbar-logo">TenderBridge Portal</div>
      </div>

      <div className="topbar-right">
        <button 
          className="topbar-btn"
          onClick={onBackToLanding}
          title="Back to landing page"
        >
          <ArrowLeft size={18} />
        </button>

        <ThemeToggle />

        <button className="topbar-btn" title="Notifications">
          <Bell size={18} />
          <span className="notification-badge">3</span>
        </button>

        <div className="topbar-user">
          <div className="topbar-user-avatar">
            {user ? getInitials(user.email) : 'U'}
          </div>
          <div className="topbar-user-info">
            <div className="topbar-user-name">
              {user?.Contractor?.companyName || user?.email || 'User'}
            </div>
            <div className="topbar-user-role">
              {user?.role || 'User'}
            </div>
          </div>
        </div>

        <button 
          className="topbar-btn"
          onClick={logout}
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};
