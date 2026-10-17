import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, ArrowLeft, User } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../../contexts/AuthContext';
import { getInitials } from '../../utils/formatters';

export const TopBar = ({ onBackToLanding, onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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

        <div
          className="topbar-user"
          onClick={() => navigate('/portal/profile')}
          title="Manage Account & Profile"
          style={{ cursor: 'pointer' }}
        >
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
