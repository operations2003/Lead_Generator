import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  Target,
  CalendarCheck,
  Send,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';

export interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavMenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse }) => {
  const mainNavItems: NavMenuItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/companies', label: 'Companies', icon: <Building2 size={20} />, badge: '142' },
    { path: '/contacts', label: 'Contacts', icon: <Users size={20} /> },
    { path: '/leads', label: 'Leads', icon: <Target size={20} />, badge: '28' },
    { path: '/follow-ups', label: 'Follow-ups', icon: <CalendarCheck size={20} />, badge: '5' },
    { path: '/campaigns', label: 'Outreach', icon: <Send size={20} /> },
    { path: '/reports', label: 'Reports', icon: <BarChart3 size={20} /> },
  ];

  const systemNavItems: NavMenuItem[] = [
    { path: '/settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <NavLink to="/dashboard" className="brand-logo">
          <div className="brand-icon">
            <Layers size={20} />
          </div>
          {!collapsed && <span>Nexus<span style={{ color: 'var(--primary-400)' }}>IT</span></span>}
        </NavLink>
        <button
          className="btn btn-icon-only btn-secondary"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label="Toggle Sidebar"
          style={{ padding: '0.35rem' }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {!collapsed && <div className="nav-group-label">Core Platform</div>}
        {mainNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={collapsed ? item.label : undefined}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
            {!collapsed && item.badge && <span className="badge-count">{item.badge}</span>}
          </NavLink>
        ))}

        <div style={{ marginTop: 'auto' }}>
          {!collapsed && <div className="nav-group-label">System</div>}
          {systemNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </div>
      </nav>
    </aside>
  );
};
