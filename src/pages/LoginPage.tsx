import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context';
import { ShieldCheck, Eye, EyeOff, Loader2, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const isExpired = searchParams.get('expired') === 'true';
  const fromLocation = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  useEffect(() => {
    // If already authenticated, redirect immediately
    if (isAuthenticated) {
      navigate(fromLocation, { replace: true });
    }
  }, [isAuthenticated, navigate, fromLocation]);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    // Frontend validation
    if (!email.trim()) {
      setLocalError('Please enter your email address');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password');
      return;
    }

    try {
      setIsSubmitting(true);
      await login({ email: email.trim(), password, rememberMe });
      navigate(fromLocation, { replace: true });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setLocalError(errorObj.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setLocalError(null);
    clearError();
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: 'var(--bg-app)',
      }}
    >
      {/* Left side: Brand Showcase */}
      <div
        style={{
          flex: 1,
          display: 'none',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '3.5rem',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))',
          borderRight: '1px solid var(--border-subtle)',
          position: 'relative',
          overflow: 'hidden',
        }}
        className="login-hero-banner"
      >
        <div style={{ zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <span
              style={{
                fontFamily: 'var(--font-family-heading)',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              LeadMap Enterprise
            </span>
          </div>

          <h2
            style={{
              fontSize: '2.25rem',
              fontWeight: 800,
              lineHeight: 1.25,
              color: 'var(--text-primary)',
              marginBottom: '1rem',
              maxWidth: '480px',
            }}
          >
            Intelligent B2B Sales & Lead Pipeline Management
          </h2>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '1.05rem',
              lineHeight: 1.6,
              maxWidth: '460px',
            }}
          >
            Controlled access with enterprise-grade role-based authentication, real-time lead analytics, and high-velocity deal tracking.
          </p>

          <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={18} color="var(--primary-400)" />
              <span style={{ fontSize: '0.925rem' }}>Encrypted session management & JWT protection</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={18} color="var(--primary-400)" />
              <span style={{ fontSize: '0.925rem' }}>Strict Role-Based Access Control (RBAC)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={18} color="var(--primary-400)" />
              <span style={{ fontSize: '0.925rem' }}>Brute-force protection & account lockout defense</span>
            </div>
          </div>
        </div>

        <div style={{ zIndex: 2, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          &copy; {new Date().getFullYear()} LeadMap CRM. All rights reserved.
        </div>
      </div>

      {/* Right side: Login Form */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2.5rem 1.5rem',
          maxWidth: '560px',
          margin: '0 auto',
        }}
      >
        <div style={{ width: '100%', maxWidth: '420px' }}>
          {/* Header */}
          <div style={{ marginBottom: '2rem', textAlign: 'left' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                marginBottom: '1rem',
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                marginBottom: '0.5rem',
              }}
            >
              Sign in to your account
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Enter your credentials to access the CRM portal.
            </p>
          </div>

          {/* Session Expired Banner */}
          {isExpired && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                backgroundColor: 'var(--status-warning-bg)',
                border: '1px solid var(--status-warning-border)',
                color: 'var(--status-warning-text)',
                marginBottom: '1.25rem',
                fontSize: '0.875rem',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>Your session has expired. Please sign in again to continue.</span>
            </div>
          )}

          {/* Error Banner */}
          {(localError || error) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                backgroundColor: 'var(--status-error-bg)',
                border: '1px solid var(--status-error-border)',
                color: 'var(--status-error-text)',
                marginBottom: '1.25rem',
                fontSize: '0.875rem',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{localError || error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="email-input">
                Email Address
              </label>
              <input
                id="email-input"
                type="email"
                className="form-input"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="password-input">
                  Password
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  style={{ paddingRight: '2.5rem' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Remember this session
              </label>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>24h token validity</span>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials for Fast Evaluation */}
          <div
            style={{
              marginTop: '2rem',
              padding: '1.25rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.75rem',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '0.825rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <Sparkles size={14} color="var(--primary-400)" />
              <span>Demo Accounts (Click to Autofill)</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  fontSize: '0.8rem',
                }}
                onClick={() => fillCredentials('admin@leadgen.com', 'Admin@12345')}
              >
                <span><strong>Admin:</strong> admin@leadgen.com</span>
                <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>Full Access</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  fontSize: '0.8rem',
                }}
                onClick={() => fillCredentials('sakshi@leadgen.com', 'Sakshi@12345')}
              >
                <span><strong>Sales Rep:</strong> sakshi@leadgen.com</span>
                <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>Leads & Contacts</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  fontSize: '0.8rem',
                }}
                onClick={() => fillCredentials('manager@leadgen.com', 'Manager@12345')}
              >
                <span><strong>Manager:</strong> manager@leadgen.com</span>
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Team & Reports</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media (min-width: 900px) {
          .login-hero-banner {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
};
