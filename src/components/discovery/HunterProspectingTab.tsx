/// <reference path="../../types/jsx.d.ts" />
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Compass,
  Search,
  ExternalLink,
  Mail,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Download,
  Database,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  RefreshCw,
  UserCheck,
  Key,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { hunterApiService } from '../../api';
import {
  HunterStatusResponse,
  HunterProspectLead,
  HunterEmailVerifierResult,
  HunterEmailFinderResult,
} from '../../types';

interface HunterProspectingTabProps {
  onLeadsSaved?: () => void;
}

const COMMON_INDUSTRIES = [
  'Software Development',
  'IT Services & Consulting',
  'Cloud & Cybersecurity',
  'Financial Services',
  'Healthcare & Clinics',
  'Marketing & Advertising',
  'Staffing & Recruiting',
  'E-commerce & Retail',
  'Legal & Law Practice',
];

const COMMON_LOCATIONS = [
  'Austin, TX',
  'San Francisco, CA',
  'New York, NY',
  'London, UK',
  'Bengaluru, India',
  'Toronto, Canada',
  'Berlin, Germany',
  'Sydney, Australia',
];

export const HunterProspectingTab: React.FC<HunterProspectingTabProps> = ({ onLeadsSaved }) => {
  // Status & credits state
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusData, setStatusData] = useState<HunterStatusResponse | null>(null);

  // Search parameters
  const [industry, setIndustry] = useState('Software Development');
  const [location, setLocation] = useState('Austin, TX');
  const [keywords, setKeywords] = useState('');
  const [limit, setLimit] = useState(10);
  const [enrichEmails, setEnrichEmails] = useState(true);

  // Prospecting execution state
  const [isProspecting, setIsProspecting] = useState(false);
  const [prospects, setProspects] = useState<HunterProspectLead[]>([]);
  const [limitationNotice, setLimitationNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter & search within results
  const [searchTerm, setSearchTerm] = useState('');
  const [emailFilter, setEmailFilter] = useState<'all' | 'has_emails' | 'personal_only'>('all');
  const [minConfidence, setMinConfidence] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // On-demand verification state (email -> result)
  const [verifyingEmail, setVerifyingEmail] = useState<string | null>(null);
  const [verificationResults, setVerificationResults] = useState<Record<string, HunterEmailVerifierResult>>({});

  // Single Email Finder tool state
  const [showFinderModal, setShowFinderModal] = useState(false);
  const [finderDomain, setFinderDomain] = useState('');
  const [finderFirstName, setFinderFirstName] = useState('');
  const [finderLastName, setFinderLastName] = useState('');
  const [finderLoading, setFinderLoading] = useState(false);
  const [finderResult, setFinderResult] = useState<HunterEmailFinderResult | null>(null);
  const [finderError, setFinderError] = useState<string | null>(null);

  // CRM saving state
  const [isSavingCrm, setIsSavingCrm] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Expanded sources per email
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await hunterApiService.getStatus();
      if (res.data) {
        setStatusData(res.data);
      }
    } catch {
      setStatusData({
        configured: false,
        message: 'Could not contact backend to verify Hunter.io status.',
      });
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Execute Hunter Prospecting
  const handleStartProspecting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusData?.configured) {
      setErrorMessage('Hunter.io API Key is not configured. Please set HUNTER_API_KEY in backend .env.');
      return;
    }

    if (!industry.trim() && !location.trim() && !keywords.trim()) {
      setErrorMessage('Please specify at least an Industry, Location, or Keywords to search.');
      return;
    }

    setIsProspecting(true);
    setErrorMessage(null);
    setLimitationNotice(null);
    setSaveSuccessMsg(null);
    setProspects([]);
    setSelectedIds(new Set());
    setCurrentPage(1);

    try {
      const parsedKeywords = keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      const res = await hunterApiService.prospect({
        industry: industry.trim() || undefined,
        location: location.trim() || undefined,
        keywords: parsedKeywords.length > 0 ? parsedKeywords : undefined,
        limit,
        enrichEmails,
      });

      if (res.data) {
        setProspects(res.data.prospects || []);
        if (res.data.limitationNotice) {
          setLimitationNotice(res.data.limitationNotice);
        }
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string; code?: string };
      setErrorMessage(errorObj.message || 'Failed to execute Hunter.io prospecting search.');
    } finally {
      setIsProspecting(false);
      // Refresh credit counts after request
      fetchStatus();
    }
  };

  // Filtered & paginated results
  const filteredProspects = useMemo(() => {
    return prospects.filter((p) => {
      // Text search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = p.organization.toLowerCase().includes(query);
        const matchesDomain = p.domain.toLowerCase().includes(query);
        const matchesDesc = (p.description || '').toLowerCase().includes(query);
        const matchesEmails = p.emails.some(
          (e) =>
            e.value.toLowerCase().includes(query) ||
            (e.first_name || '').toLowerCase().includes(query) ||
            (e.last_name || '').toLowerCase().includes(query)
        );
        if (!matchesName && !matchesDomain && !matchesDesc && !matchesEmails) {
          return false;
        }
      }

      // Email filter
      if (emailFilter === 'has_emails' && p.emails.length === 0) {
        return false;
      }
      if (emailFilter === 'personal_only') {
        const hasPersonal = p.emails.some((e) => e.type === 'personal');
        if (!hasPersonal) return false;
      }

      // Minimum confidence
      if (minConfidence > 0) {
        const hasHighConfidence = p.emails.some((e) => e.confidence >= minConfidence);
        if (!hasHighConfidence) return false;
      }

      return true;
    });
  }, [prospects, searchTerm, emailFilter, minConfidence]);

  const totalPages = Math.ceil(filteredProspects.length / pageSize) || 1;
  const paginatedProspects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProspects.slice(start, start + pageSize);
  }, [filteredProspects, currentPage, pageSize]);

  // Checkbox management
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredProspects.map((p) => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // On-demand Email Verification
  const handleVerifyEmail = async (email: string) => {
    setVerifyingEmail(email);
    try {
      const res = await hunterApiService.verifyEmail(email);
      if (res.data) {
        setVerificationResults((prev) => ({
          ...prev,
          [email]: res.data,
        }));
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      alert(`Verification error: ${errorObj.message || 'Could not verify email'}`);
    } finally {
      setVerifyingEmail(null);
      fetchStatus();
    }
  };

  // Save selected to CRM
  const handleSaveToCrm = async () => {
    const toSave = prospects.filter((p) => selectedIds.has(p.id));
    if (toSave.length === 0) return;

    setIsSavingCrm(true);
    setSaveSuccessMsg(null);
    try {
      const res = await hunterApiService.saveToCrm(toSave);
      if (res.data) {
        setSaveSuccessMsg(
          `Successfully saved ${res.data.savedCompanies} companies, ${res.data.savedContacts} contacts, and ${res.data.savedLeads} leads to CRM.`
        );
        // Mark prospects as inCrm locally
        setProspects((prev) =>
          prev.map((p) => (selectedIds.has(p.id) ? { ...p, inCrm: true } : p))
        );
        setSelectedIds(new Set());
        onLeadsSaved?.();
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      alert(`Failed to save leads to CRM: ${errorObj.message || 'Error occurred'}`);
    } finally {
      setIsSavingCrm(false);
    }
  };

  // Export to CSV
  const handleExportCsv = async () => {
    const toExport =
      selectedIds.size > 0
        ? prospects.filter((p) => selectedIds.has(p.id))
        : filteredProspects;
    if (toExport.length === 0) return;

    try {
      await hunterApiService.exportCsv(toExport);
    } catch (err: unknown) {
      alert(`CSV export failed: ${(err as Error).message}`);
    }
  };

  // Single Email Finder tool execution
  const handleFindSingleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finderDomain.trim() || !finderFirstName.trim() || !finderLastName.trim()) {
      setFinderError('Please provide Domain, First Name, and Last Name.');
      return;
    }

    setFinderLoading(true);
    setFinderError(null);
    setFinderResult(null);
    try {
      const res = await hunterApiService.findEmail({
        domain: finderDomain.trim(),
        firstName: finderFirstName.trim(),
        lastName: finderLastName.trim(),
      });
      if (res.data) {
        setFinderResult(res.data);
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setFinderError(errorObj.message || 'Failed to locate contact email.');
    } finally {
      setFinderLoading(false);
      fetchStatus();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(text);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* HUNTER API STATUS & CREDITS BANNER */}
      {statusLoading ? (
        <div
          style={{
            padding: '1rem',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.03))',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'var(--text-muted)',
            fontSize: '0.875rem',
          }}
        >
          <Loader2 size={16} className="spin" />
          <span>Connecting to official Hunter.io API...</span>
        </div>
      ) : !statusData?.configured ? (
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
          }}
        >
          <Key size={22} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 700, color: '#f87171' }}>
              Hunter.io API Key Not Configured
            </h4>
            <p style={{ margin: '0 0 8px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              To enable Hunter.io B2B discovery and domain search, add your Hunter API key to the backend environment file:
            </p>
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(0,0,0,0.4)',
                fontFamily: 'monospace',
                fontSize: '0.8125rem',
                color: '#34d399',
                display: 'inline-block',
                marginBottom: '8px',
              }}
            >
              HUNTER_API_KEY=your_actual_hunter_key_here
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Get your API key at{' '}
              <a
                href="https://hunter.io/api_keys"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#60a5fa', textDecoration: 'underline' }}
              >
                hunter.io/api_keys
              </a>
              . Once added, restart the backend server and click refresh below.
            </div>
          </div>
          <button
            onClick={fetchStatus}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} />
            <span>Check Status</span>
          </button>
        </div>
      ) : (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.25) 0%, rgba(15, 23, 42, 0.6) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa',
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.925rem' }}>Hunter.io API Connected</span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                  }}
                >
                  {statusData.account?.plan_name || 'Active'} Plan
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Account: {statusData.account?.email || 'Authenticated'} &bull; Reset date:{' '}
                {statusData.account?.reset_date || 'End of billing cycle'}
              </div>
            </div>
          </div>

          {/* Credits remaining indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            {statusData.account?.requests && (
              <>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Search Credits
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#60a5fa' }}>
                    {statusData.account.requests.searches.available - statusData.account.requests.searches.used} /{' '}
                    {statusData.account.requests.searches.available} left
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Verification Credits
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34d399' }}>
                    {statusData.account.requests.verifications.available - statusData.account.requests.verifications.used} /{' '}
                    {statusData.account.requests.verifications.available} left
                  </div>
                </div>
              </>
            )}

            <button
              onClick={() => setShowFinderModal(true)}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Look up a specific person's email"
            >
              <UserCheck size={14} />
              <span>Email Finder Tool</span>
            </button>
          </div>
        </div>
      )}

      {/* HUNTER PROSPECTING SEARCH FORM */}
      <div
        className="card"
        style={{
          padding: '1.25rem',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={18} color="#3b82f6" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
              B2B Company Discovery & Contact Search
            </h3>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Powered by Hunter API v2 (POST /discover & GET /domain-search)
          </span>
        </div>

        <form onSubmit={handleStartProspecting}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            {/* Industry */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px' }}>
                Industry / Business Sector
              </label>
              <input
                type="text"
                className="input"
                list="hunter-industries"
                placeholder="e.g. Software Development"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                disabled={isProspecting}
              />
              <datalist id="hunter-industries">
                {COMMON_INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind} />
                ))}
              </datalist>
            </div>

            {/* Location */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px' }}>
                Headquarters Location
              </label>
              <input
                type="text"
                className="input"
                list="hunter-locations"
                placeholder="e.g. Austin, TX"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={isProspecting}
              />
              <datalist id="hunter-locations">
                {COMMON_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>
            </div>

            {/* Keywords */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px' }}>
                Target Keywords (Optional)
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. SaaS, AI, recruitment"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                disabled={isProspecting}
              />
            </div>

            {/* Limit */}
            <div style={{ maxWidth: '140px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px' }}>
                Result Limit
              </label>
              <select
                className="input"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                disabled={isProspecting}
              >
                <option value={5}>5 Companies</option>
                <option value={10}>10 Companies</option>
                <option value={20}>20 Companies</option>
                <option value={50}>50 Companies</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enrichEmails}
                onChange={(e) => setEnrichEmails(e.target.checked)}
                disabled={isProspecting}
              />
              <span>Automatically retrieve domain emails (via Domain Search)</span>
            </label>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isProspecting || !statusData?.configured}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                fontWeight: 600,
                backgroundColor: '#2563eb',
              }}
            >
              {isProspecting ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Discovering & Prospecting...</span>
                </>
              ) : (
                <>
                  <Search size={16} />
                  <span>Discover Matching Companies</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* ERROR / NOTICE BANNER */}
        {errorMessage && (
          <div
            style={{
              marginTop: '1rem',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.825rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {limitationNotice && (
          <div
            style={{
              marginTop: '1rem',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#fbbf24',
              fontSize: '0.825rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Hunter.io Plan Limitation:</strong> {limitationNotice}
            </div>
          </div>
        )}

        {saveSuccessMsg && (
          <div
            style={{
              marginTop: '1rem',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              fontSize: '0.825rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* RESULTS SECTION */}
      {prospects.length > 0 && (
        <div
          className="card"
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          {/* TOOLBAR */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '1rem',
              paddingBottom: '0.85rem',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            {/* Search & filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', minWidth: '220px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="input"
                  placeholder="Filter companies or emails..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '32px', fontSize: '0.8125rem' }}
                />
              </div>

              <select
                className="input"
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value as 'all' | 'has_emails' | 'personal_only')}
                style={{ fontSize: '0.8125rem', width: 'auto' }}
              >
                <option value="all">All Results ({prospects.length})</option>
                <option value="has_emails">Has Emails Only</option>
                <option value="personal_only">Personal Emails Only</option>
              </select>

              <select
                className="input"
                value={minConfidence}
                onChange={(e) => setMinConfidence(Number(e.target.value))}
                style={{ fontSize: '0.8125rem', width: 'auto' }}
              >
                <option value={0}>Any Confidence</option>
                <option value={70}>70%+ Confidence</option>
                <option value={85}>85%+ Confidence</option>
                <option value={95}>95%+ Confidence</option>
              </select>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleExportCsv}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                title="Export matching prospects to CSV"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>

              <button
                className="btn btn-primary btn-sm"
                onClick={handleSaveToCrm}
                disabled={selectedIds.size === 0 || isSavingCrm}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#10b981',
                }}
              >
                {isSavingCrm ? <Loader2 size={14} className="spin" /> : <Database size={14} />}
                <span>Save to CRM ({selectedIds.size})</span>
              </button>
            </div>
          </div>

          {/* TABLE SELECT ALL BAR */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedIds.size > 0 && selectedIds.size === filteredProspects.length}
                onChange={handleSelectAll}
              />
              <span>
                Select All Matching (<strong>{selectedIds.size}</strong> selected)
              </span>
            </label>
            <span>
              Showing {paginatedProspects.length} of {filteredProspects.length} companies
            </span>
          </div>

          {/* COMPANY PROSPECT CARDS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {paginatedProspects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No companies match your active filters.
              </div>
            ) : (
              paginatedProspects.map((lead) => {
                const isSelected = selectedIds.has(lead.id);

                return (
                  <div
                    key={lead.id}
                    style={{
                      padding: '1.25rem',
                      borderRadius: '10px',
                      backgroundColor: isSelected
                        ? 'rgba(59, 130, 246, 0.05)'
                        : 'var(--bg-subtle, rgba(255,255,255,0.02))',
                      border: isSelected ? '1px solid #3b82f6' : '1px solid var(--border-color)',
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '12px',
                        marginBottom: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(lead.id)}
                          style={{ marginTop: '4px' }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                              {lead.organization}
                            </h4>
                            {lead.inCrm && (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  padding: '1px 7px',
                                  borderRadius: '999px',
                                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                  color: '#34d399',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                }}
                              >
                                Already in CRM
                              </span>
                            )}
                            {lead.industry && (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                  color: '#60a5fa',
                                }}
                              >
                                {lead.industry}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {lead.location && <span>{lead.location} &bull; </span>}
                            {lead.headcount && <span>Size: {lead.headcount} &bull; </span>}
                            <a
                              href={lead.domain.startsWith('http') ? lead.domain : `https://${lead.domain}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <span>{lead.domain}</span>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Emails counter badge */}
                      <div
                        style={{
                          fontSize: '0.78rem',
                          padding: '4px 9px',
                          borderRadius: '6px',
                          backgroundColor: lead.emails.length > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)',
                          color: lead.emails.length > 0 ? '#34d399' : 'var(--text-muted)',
                          fontWeight: 600,
                        }}
                      >
                        {lead.emails.length} contact emails
                      </div>
                    </div>

                    {lead.description && (
                      <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {lead.description}
                      </p>
                    )}

                    {/* EMAILS LIST */}
                    {lead.emails.length > 0 ? (
                      <div
                        style={{
                          marginTop: '8px',
                          paddingTop: '8px',
                          borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.05))',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        {lead.emails.map((email) => {
                          const vResult = verificationResults[email.value];
                          const isVerifying = verifyingEmail === email.value;
                          const sourcesOpen = expandedSources[email.value];

                          return (
                            <div
                              key={email.value}
                              style={{
                                padding: '8px 10px',
                                borderRadius: '6px',
                                backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.03))',
                                border: '1px solid var(--border-color)',
                                fontSize: '0.8125rem',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: '8px',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Mail size={14} color="#60a5fa" />
                                  <strong style={{ color: '#f8fafc' }}>{email.value}</strong>

                                  <button
                                    onClick={() => copyToClipboard(email.value)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: 'var(--text-muted)',
                                      padding: '2px',
                                    }}
                                    title="Copy email address"
                                  >
                                    {copiedEmail === email.value ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                                  </button>

                                  <span
                                    style={{
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      backgroundColor:
                                        email.type === 'personal' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                                      color: email.type === 'personal' ? '#60a5fa' : '#94a3b8',
                                    }}
                                  >
                                    {email.type}
                                  </span>

                                  {/* Confidence Badge */}
                                  <span
                                    style={{
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      backgroundColor:
                                        email.confidence >= 90
                                          ? 'rgba(16, 185, 129, 0.15)'
                                          : email.confidence >= 70
                                          ? 'rgba(245, 158, 11, 0.15)'
                                          : 'rgba(239, 68, 68, 0.15)',
                                      color:
                                        email.confidence >= 90
                                          ? '#34d399'
                                          : email.confidence >= 70
                                          ? '#fbbf24'
                                          : '#f87171',
                                    }}
                                  >
                                    {email.confidence}% confidence
                                  </span>
                                </div>

                                {/* Verification Status & Action */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {vResult ? (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        color:
                                          vResult.result === 'deliverable'
                                            ? '#34d399'
                                            : vResult.result === 'risky'
                                            ? '#fbbf24'
                                            : '#f87171',
                                      }}
                                    >
                                      {vResult.result === 'deliverable' ? (
                                        <ShieldCheck size={14} />
                                      ) : (
                                        <ShieldAlert size={14} />
                                      )}
                                      <span>
                                        {vResult.status.toUpperCase()} ({vResult.result})
                                      </span>
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleVerifyEmail(email.value)}
                                      disabled={isVerifying}
                                      className="btn btn-secondary btn-sm"
                                      style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                                      title="Verify deliverability using 1 Hunter verification credit"
                                    >
                                      {isVerifying ? (
                                        <Loader2 size={12} className="spin" />
                                      ) : (
                                        <span>Verify Deliverability</span>
                                      )}
                                    </button>
                                  )}

                                  {/* Sources toggle */}
                                  {email.sources && email.sources.length > 0 && (
                                    <button
                                      onClick={() =>
                                        setExpandedSources((prev) => ({
                                          ...prev,
                                          [email.value]: !prev[email.value],
                                        }))
                                      }
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--text-muted)',
                                        fontSize: '0.72rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                      }}
                                    >
                                      <span>{email.sources.length} sources</span>
                                      {sourcesOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Contact Person Details if available */}
                              {(email.first_name || email.last_name || email.position || email.department) && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                  {[email.first_name, email.last_name].filter(Boolean).join(' ')}
                                  {email.position && ` &bull; ${email.position}`}
                                  {email.department && ` &bull; Dept: ${email.department}`}
                                </div>
                              )}

                              {/* Sources expansion */}
                              {sourcesOpen && email.sources && (
                                <div
                                  style={{
                                    marginTop: '6px',
                                    padding: '6px 8px',
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(0,0,0,0.3)',
                                    fontSize: '0.72rem',
                                  }}
                                >
                                  <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>
                                    Public Web Sources Detected by Hunter:
                                  </div>
                                  <ul style={{ margin: 0, paddingLeft: '16px', color: '#94a3b8' }}>
                                    {email.sources.slice(0, 5).map((s, idx) => (
                                      <li key={idx} style={{ marginBottom: '2px', wordBreak: 'break-all' }}>
                                        <a href={s.uri} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>
                                          {s.uri}
                                        </a>{' '}
                                        <span style={{ color: 'var(--text-muted)' }}>({s.extracted_on})</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No direct emails uncovered for domain yet. Use Hunter Email Finder tool for specific contacts.
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '1.25rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border-color)',
                fontSize: '0.8125rem',
              }}
            >
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* SINGLE EMAIL FINDER MODAL */}
      {showFinderModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '1.5rem',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={18} color="#3b82f6" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                  Hunter.io Email Finder
                </h3>
              </div>
              <button
                onClick={() => setShowFinderModal(false)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 8px' }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '0 0 1rem' }}>
              Look up the verified corporate email address for a specific decision maker using Hunter's Email Finder API.
            </p>

            <form onSubmit={handleFindSingleEmail}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>
                    First Name
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Alexis"
                    value={finderFirstName}
                    onChange={(e) => setFinderFirstName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Ohanian"
                    value={finderLastName}
                    onChange={(e) => setFinderLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>
                  Company Domain
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. reddit.com"
                  value={finderDomain}
                  onChange={(e) => setFinderDomain(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowFinderModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={finderLoading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {finderLoading && <Loader2 size={14} className="spin" />}
                  <span>Find Email</span>
                </button>
              </div>
            </form>

            {finderError && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#f87171',
                  fontSize: '0.8rem',
                }}
              >
                {finderError}
              </div>
            )}

            {finderResult && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34d399' }}>
                    Email Found:
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#60a5fa' }}>
                    {finderResult.score}% Confidence
                  </span>
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                  {finderResult.email || 'No email found'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {finderResult.first_name} {finderResult.last_name} &bull; {finderResult.position || 'Role at'} &bull; {finderResult.domain}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
