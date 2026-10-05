import React from 'react';
import { Bell, Plus, Menu, User, ShieldCheck } from 'lucide-react';
import { SearchInput } from '../common/SearchInput';
import { Dropdown } from '../common/Dropdown';

export interface TopNavProps {
  onMobileMenuClick?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onMobileMenuClick }) => {
  const userMenuItems = [
    {
      id: 'profile',
      label: 'Account Profile',
      icon: <User size={16} />,
      onClick: () => console.log('Profile clicked'),
    },
    {
      id: 'security',
      label: 'Security & API Keys',
      icon: <ShieldCheck size={16} />,
      onClick: () => console.log('Security clicked'),
    },
    {
      id: 'logout',
      label: 'Sign Out',
      danger: true,
      divider: true,
      onClick: () => console.log('Logout clicked'),
    },
  ];

  return (
    <header className="top-nav">
      <div className="top-nav-left">
        {onMobileMenuClick && (
          <button
            className="btn btn-icon-only btn-secondary"
            onClick={onMobileMenuClick}
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
        )}
        <SearchInput placeholder="Quick search companies, leads, contacts..." />
      </div>

      <div className="top-nav-right">
        <button className="btn btn-primary btn-sm">
          <Plus size={16} />
          <span>New Lead</span>
        </button>

        <button
          className="btn btn-icon-only btn-secondary"
          style={{ position: 'relative' }}
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span
            style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-500)',
            }}
          />
        </button>

        <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--border-subtle)' }} />

        <Dropdown
          align="right"
          trigger={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary-600), var(--primary-800))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  border: '1px solid var(--border-strong)',
                }}
              >
                SK
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Sakshi K.
                </span>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                  Sales Director
                </span>
              </div>
            </div>
          }
          items={userMenuItems}
        />
      </div>
    </header>
  );
};
