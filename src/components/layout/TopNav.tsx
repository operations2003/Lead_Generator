import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Plus, Menu, User, ShieldCheck, LogOut, CheckCircle } from 'lucide-react';
import { SearchInput } from '../common/SearchInput';
import { Dropdown } from '../common/Dropdown';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context';

export interface TopNavProps {
  onMobileMenuClick?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onMobileMenuClick }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  const getInitials = (): string => {
    if (!user) return 'U';
    const first = user.firstName ? user.firstName[0].toUpperCase() : '';
    const last = user.lastName ? user.lastName[0].toUpperCase() : '';
    return first + last || user.email[0].toUpperCase();
  };

  const getRoleLabel = (role?: string): string => {
    switch (role) {
      case 'admin':
        return 'System Admin';
      case 'manager':
        return 'Sales Manager';
      case 'sales_rep':
        return 'Sales Representative';
      case 'viewer':
        return 'Viewer (Read-Only)';
      default:
        return role ? role.replace('_', ' ') : 'User';
    }
  };

  const getRoleBadgeColor = (role?: string): string => {
    switch (role) {
      case 'admin':
        return 'linear-gradient(135deg, #7C3AED, #4F46E5)';
      case 'manager':
        return 'linear-gradient(135deg, #059669, #0D9488)';
      case 'sales_rep':
        return 'linear-gradient(135deg, #4F46E5, #3B82F6)';
      default:
        return 'linear-gradient(135deg, #475569, #334155)';
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      id: 'profile',
      label: 'Account Profile',
      icon: <User size={16} />,
      onClick: () => setShowProfileModal(true),
    },
    {
      id: 'security',
      label: 'Security & Permissions',
      icon: <ShieldCheck size={16} />,
      onClick: () => setShowSecurityModal(true),
    },
    {
      id: 'logout',
      label: 'Sign Out',
      icon: <LogOut size={16} />,
      danger: true,
      divider: true,
      onClick: handleSignOut,
    },
  ];

  return (
    <>
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
              <button
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: getRoleBadgeColor(user?.role),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: '#FFFFFF',
                    border: '1px solid var(--border-strong)',
                    flexShrink: 0,
                  }}
                >
                  {getInitials()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {user ? `${user.firstName} ${user.lastName}` : 'Guest User'}
                  </span>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    {getRoleLabel(user?.role)}
                  </span>
                </div>
              </button>
            }
            items={userMenuItems}
          />
        </div>
      </header>

      {/* Profile Details Modal */}
      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="Account Profile"
        maxWidth="540px"
      >
        {user && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: getRoleBadgeColor(user.role),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1.25rem',
                  color: '#FFFFFF',
                }}
              >
                {getInitials()}
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  {user.firstName} {user.lastName}
                </h3>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{user.email}</span>
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-app)',
                borderRadius: '8px',
                padding: '1rem',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                fontSize: '0.875rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Role</span>
                <span style={{ fontWeight: 600, color: 'var(--primary-400)' }}>{getRoleLabel(user.role)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Account Status</span>
                <span className="badge badge-success" style={{ textTransform: 'capitalize' }}>
                  {user.status}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Last Active</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Just now'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>User ID</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {user.id}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Security & Permissions Modal */}
      <Modal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        title="Security & Permissions"
        maxWidth="540px"
      >
        {user && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                backgroundColor: 'var(--status-success-bg)',
                border: '1px solid var(--status-success-border)',
                color: 'var(--status-success-text)',
                fontSize: '0.875rem',
              }}
            >
              <CheckCircle size={18} />
              <span>Authentication session is secure and active (JWT 24h validity).</span>
            </div>

            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                Assigned Permissions ({user.permissions?.length || 0})
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {user.permissions && user.permissions.length > 0 ? (
                  user.permissions.map((perm: string) => (
                    <span
                      key={perm}
                      className="badge badge-neutral"
                      style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                    >
                      {perm}
                    </span>
                  ))
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No explicit permissions assigned</span>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
