import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const state = location.state as {
    requiredRoles?: string[];
    requiredPermissions?: string[];
    currentRole?: string;
  } | undefined;

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: 'var(--bg-app)',
        padding: '1.5rem',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
          padding: '2.5rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--status-error-bg)',
            border: '1px solid var(--status-error-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--status-error-text)',
          }}
        >
          <ShieldAlert size={36} />
        </div>

        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Access Restricted (403)
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: '1.5' }}>
            You do not have the required permissions or role privileges to view this page or perform this action.
          </p>
        </div>

        {user && (
          <div
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-app)',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              textAlign: 'left',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Signed in as:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Current Role:</span>
              <span
                style={{
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  color: 'var(--primary-400)',
                }}
              >
                {user.role.replace('_', ' ')}
              </span>
            </div>
            {state?.requiredRoles && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Required Roles:</span>
                <span style={{ fontWeight: 600, color: 'var(--status-warning-text)' }}>
                  {state.requiredRoles.join(', ')}
                </span>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </button>
          <button
            className="btn btn-secondary"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              borderColor: 'var(--status-error-border)',
              color: 'var(--status-error-text)',
            }}
            onClick={handleSignOut}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
