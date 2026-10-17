import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  DollarSign,
  Package,
  ClipboardCheck,
  BarChart3,
  Settings,
  Bot,
} from 'lucide-react';
import clsx from 'clsx';

const navigationConfig = {
  admin: [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', id: 'dashboard' },
    { icon: <FileText size={20} />, label: 'Tenders', id: 'tenders' },
    { icon: <Users size={20} />, label: 'Contractors', id: 'contractors' },
    { icon: <Building2 size={20} />, label: 'Projects', id: 'projects' },
    { icon: <DollarSign size={20} />, label: 'Payments', id: 'payments' },
    { icon: <Package size={20} />, label: 'Materials', id: 'materials' },
    { icon: <ClipboardCheck size={20} />, label: 'Inspections', id: 'inspections' },
    { icon: <BarChart3 size={20} />, label: 'Reports', id: 'reports' },
    { icon: <Bot size={20} />, label: 'AI Assistant', id: 'ai-assistant' },
    { icon: <Settings size={20} />, label: 'Profile', id: 'profile' },
  ],
  contractor: [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', id: 'dashboard' },
    { icon: <FileText size={20} />, label: 'Browse Tenders', id: 'tenders' },
    { icon: <Building2 size={20} />, label: 'My Projects', id: 'projects' },
    { icon: <DollarSign size={20} />, label: 'Payments', id: 'payments' },
    { icon: <Bot size={20} />, label: 'AI Assistant', id: 'ai-assistant' },
    { icon: <Settings size={20} />, label: 'Profile', id: 'profile' },
  ],
  engineer: [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', id: 'dashboard' },
    { icon: <Building2 size={20} />, label: 'Projects', id: 'projects' },
    { icon: <ClipboardCheck size={20} />, label: 'Inspections', id: 'inspections' },
    { icon: <Package size={20} />, label: 'Materials', id: 'materials' },
    { icon: <DollarSign size={20} />, label: 'Approvals', id: 'approvals' },
    { icon: <Bot size={20} />, label: 'AI Assistant', id: 'ai-assistant' },
    { icon: <Settings size={20} />, label: 'Profile', id: 'profile' },
  ],
  finance_officer: [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', id: 'dashboard' },
    { icon: <DollarSign size={20} />, label: 'Payments', id: 'payments' },
    { icon: <BarChart3 size={20} />, label: 'Financial Reports', id: 'reports' },
    { icon: <Bot size={20} />, label: 'AI Assistant', id: 'ai-assistant' },
    { icon: <Settings size={20} />, label: 'Profile', id: 'profile' },
  ],
  project_manager: [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', id: 'dashboard' },
    { icon: <Building2 size={20} />, label: 'Projects', id: 'projects' },
    { icon: <Package size={20} />, label: 'Materials', id: 'materials' },
    { icon: <ClipboardCheck size={20} />, label: 'Inspections', id: 'inspections' },
    { icon: <Users size={20} />, label: 'Team', id: 'team' },
    { icon: <Bot size={20} />, label: 'AI Assistant', id: 'ai-assistant' },
    { icon: <Settings size={20} />, label: 'Profile', id: 'profile' },
  ],
};

export const Sidebar = ({ userRole, collapsed = false }) => {
  const { pathname } = useLocation();
  const navigation = navigationConfig[userRole] || navigationConfig.contractor;
  const activeView = pathname.startsWith('/portal/')
    ? pathname.split('/')[2]
    : 'dashboard';

  return (
    <aside className={clsx('sidebar', collapsed && 'sidebar-collapsed')}>
      <div className="sidebar-content">
        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <Link
              key={item.id}
              to={`/portal/${item.id}`}
              className={clsx('sidebar-nav-item', activeView === item.id && 'active')}
              title={item.label}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              {!collapsed && <span className="sidebar-nav-label">{item.label}</span>}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
};