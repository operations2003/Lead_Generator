import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context';
import { UserRole } from '../../types';
import { ShieldCheck, Loader2 } from 'lucide-react';

export interface ProtectedRouteProps {
  requiredRoles?: UserRole[];
  requiredPermissions?: string[];
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredRoles,
  requiredPermissions,
  children,
}) => {
  const { user, isAuthenticated, isLoading, hasRole, hasPermission } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          backgroundColor: 'var(--bg-app)',
          color: 'var(--text-primary)',
          gap: '1rem',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
          }}
        >
          <ShieldCheck size={28} color="#FFFFFF" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
          <Loader2 size={18} className="spin-animation" style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Verifying secure session...</span>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check roles if specified
  if (requiredRoles && requiredRoles.length > 0) {
    const isAllowed = requiredRoles.some((r) => hasRole(r));
    if (!isAllowed) {
      return (
        <Navigate
          to="/unauthorized"
          state={{
            from: location,
            requiredRoles,
            currentRole: user?.role,
          }}
          replace
        />
      );
    }
  }

  // Check permissions if specified
  if (requiredPermissions && requiredPermissions.length > 0) {
    const isAllowed = requiredPermissions.every((p) => hasPermission(p));
    if (!isAllowed) {
      return (
        <Navigate
          to="/unauthorized"
          state={{
            from: location,
            requiredPermissions,
            currentRole: user?.role,
          }}
          replace
        />
      );
    }
  }

  return children ? <>{children}</> : <Outlet />;
};
