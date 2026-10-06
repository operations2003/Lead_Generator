import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Filter,
  X,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Building2,
  Users,
  Target,
  Wrench,
  Clock,
  Star,
} from 'lucide-react';
import {
  LeadDiscoveryFilterParams,
  DiscoveryOptions,
  HIREIQ_LEAD_SIGNALS,
  HRMS_LEAD_SIGNALS,
  EXISTING_TOOLS,
} from '../../types';
import { discoveryService } from '../../api';

interface LeadDiscoveryFiltersProps {
  filters: LeadDiscoveryFilterParams;
  onChange: (filters: LeadDiscoveryFilterParams) => void;
  onReset: () => void;
  totalResults?: number;
  loading?: boolean;
}

export const LeadDiscoveryFilters: React.FC<LeadDiscoveryFiltersProps> = ({
  filters,
  onChange,
  onReset,
  totalResults,
  loading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [options, setOptions] = useState<DiscoveryOptions | null>(null);

  // Load available discovery filter options from backend
  useEffect(() => {
    let mounted = true;
    discoveryService
      .getDiscoveryOptions()
      .then((res) => {
        if (mounted && res.data) {
          setOptions(res.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load discovery options from API:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Compute selected tools and signals from comma-separated strings
  const selectedTools = useMemo(() => {
    const raw = filters.existingTools || filters.existingTool || '';
    return raw ? raw.split(',').map((t) => t.trim()).filter(Boolean) : [];
  }, [filters.existingTools, filters.existingTool]);

  const selectedSignals = useMemo(() => {
    const raw = filters.leadSignals || filters.hiringSignals || filters.signals || '';
    return raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
  }, [filters.leadSignals, filters.hiringSignals, filters.signals]);

  // Toggle tool chip
  const handleToggleTool = useCallback(
    (toolName: string) => {
      let updated: string[];
      if (selectedTools.includes(toolName)) {
        updated = selectedTools.filter((t) => t !== toolName);
      } else {
        updated = [...selectedTools, toolName];
      }
      onChange({
        ...filters,
        existingTools: updated.length > 0 ? updated.join(',') : undefined,
        existingTool: undefined,
        page: 1,
      });
    },
    [selectedTools, filters, onChange]
  );

  // Toggle signal chip
  const handleToggleSignal = useCallback(
    (signalName: string) => {
      let updated: string[];
      if (selectedSignals.includes(signalName)) {
        updated = selectedSignals.filter((s) => s !== signalName);
      } else {
        updated = [...selectedSignals, signalName];
      }
      onChange({
        ...filters,
        leadSignals: updated.length > 0 ? updated.join(',') : undefined,
        hiringSignals: undefined,
        signals: undefined,
        page: 1,
      });
    },
    [selectedSignals, filters, onChange]
  );

  // Active filter count calculation
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.product) count++;
    if (filters.priority) count++;
    if (filters.status) count++;
    if (filters.source) count++;
    if (filters.followUpStatus) count++;
    if (filters.industry) count++;
    if (filters.location) count++;
    if (filters.employeeSize) count++;
    if (filters.hiringVolume) count++;
    if (filters.productFit) count++;
    if (filters.jobTitle) count++;
    if (filters.decisionMaker !== undefined && filters.decisionMaker !== '') count++;
    if (filters.company) count++;
    if (filters.productRelevance) count++;
    if (selectedTools.length > 0) count += selectedTools.length;
    if (selectedSignals.length > 0) count += selectedSignals.length;
    return count;
  }, [filters, selectedTools, selectedSignals]);

  const existingToolList = options?.existingTools || [...EXISTING_TOOLS];
  const hireIqSignalList = options?.leadSignals?.hireIq || [...HIREIQ_LEAD_SIGNALS];
  const hrmsSignalList = options?.leadSignals?.hrms || [...HRMS_LEAD_SIGNALS];

  return (
    <div
      className="card discovery-filter-panel"
      style={{
        marginBottom: '1.25rem',
        padding: '1.25rem',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--surface-color)',
      }}
    >
      {/* Primary Discovery Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.75rem',
          justifyContent: 'space-between',
        }}
      >
        {/* Search Input Box */}
        <div style={{ position: 'relative', flex: '1 1 320px', minWidth: '260px' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            id="lead-discovery-search-input"
            className="input-field"
            placeholder="Search leads, companies, contacts, signals, or notes..."
            value={filters.search || ''}
            onChange={(e) =>
              onChange({
                ...filters,
                search: e.target.value,
                page: 1,
              })
            }
            style={{
              width: '100%',
              paddingLeft: '2.4rem',
              paddingRight: filters.search ? '2.4rem' : '0.75rem',
            }}
          />
          {filters.search && (
            <button
              type="button"
              id="clear-discovery-search-btn"
              onClick={() => onChange({ ...filters, search: '', page: 1 })}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '2px',
              }}
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Advanced Filters Toggle Button */}
          <button
            type="button"
            id="toggle-advanced-discovery-filters-btn"
            className={`btn ${isExpanded || activeFilterCount > 0 ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Filter size={16} />
            <span>Advanced Filters</span>
            {activeFilterCount > 0 && (
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.25)',
                  padding: '2px 7px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  marginLeft: '2px',
                }}
              >
                {activeFilterCount}
              </span>
            )}
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* Reset Filters Button */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              id="reset-discovery-filters-btn"
              className="btn btn-secondary"
              onClick={onReset}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              title="Reset all filters"
            >
              <RotateCcw size={15} />
              <span>Reset</span>
            </button>
          )}

          {/* Result Count Indicator */}
          {typeof totalResults === 'number' && (
            <div
              style={{
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                fontWeight: 500,
                marginLeft: '0.25rem',
              }}
            >
              {loading ? (
                <span>Searching prospects...</span>
              ) : (
                <span>
                  <strong>{totalResults}</strong> prospect{totalResults === 1 ? '' : 's'} found
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Collapsible Advanced Filters Sections */}
      {isExpanded && (
        <div
          style={{
            marginTop: '1.25rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {/* Section 1: Lead Filters */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-color)',
                marginBottom: '0.6rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <Target size={15} style={{ color: 'var(--primary-color)' }} />
              <span>Lead Filters</span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {/* Product */}
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                  Product
                </label>
                <select
                  id="filter-lead-product"
                  className="input-field"
                  value={filters.product || ''}
                  onChange={(e) => onChange({ ...filters, product: e.target.value || undefined, page: 1 })}
                >
                  <option value="">All Products</option>
                  <option value="Higher IQ">Higher IQ</option>
                  <option value="HRMS Portal">HRMS Portal</option>
                  <option value="Both">Both Suites</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                  Priority
                </label>
                <select
                  id="filter-lead-priority"
                  className="input-field"
                  value={filters.priority || ''}
                  onChange={(e) => onChange({ ...filters, priority: e.target.value || undefined, page: 1 })}
                >
                  <option value="">All Priorities</option>
                  <option value="High">High Priority ⭐</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
              </div>

              {/* Stage */}
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                  Pipeline Stage
                </label>
                <select
                  id="filter-lead-stage"
                  className="input-field"
                  value={filters.status || ''}
                  onChange={(e) => onChange({ ...filters, status: e.target.value || undefined, page: 1 })}
                >
                  <option value="">All Stages</option>
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Replied">Replied</option>
                  <option value="Demo Booked">Demo Booked</option>
                  <option value="Demo Done">Demo Done</option>
                  <option value="Won">Won</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>

              {/* Lead Source */}
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                  Lead Source
                </label>
                <select
                  id="filter-lead-source"
                  className="input-field"
                  value={filters.source || ''}
                  onChange={(e) => onChange({ ...filters, source: e.target.value || undefined, page: 1 })}
                >
                  <option value="">All Sources</option>
                  {(options?.leadSources || ['LinkedIn', 'Email', 'Phone', 'WhatsApp', 'Website', 'Free ATS Score Check', 'Referral', 'Partner']).map((src) => (
                    <option key={src} value={src}>
                      {src}
                    </option>
                  ))}
                </select>
              </div>

              {/* Follow-up Status */}
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                  Follow-up Status
                </label>
                <select
                  id="filter-lead-followup-status"
                  className="input-field"
                  value={filters.followUpStatus || ''}
                  onChange={(e) => onChange({ ...filters, followUpStatus: e.target.value || undefined, page: 1 })}
                >
                  <option value="">All Follow-up States</option>
                  <option value="Pending">Pending Action</option>
                  <option value="Overdue">Overdue ⚠️</option>
                  <option value="Today">Due Today 📅</option>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Completed">Completed</option>
                  <option value="None">No Follow-ups</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Company Filters */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-color)',
                marginBottom: '0.6rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <Building2 size={15} style={{ color: 'var(--primary-color)' }} />
              <span>Company Filters</span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {/* Industry */}
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                  Industry
                </label>
                <select
                  id="filter-company-industry"
                  className="input-field"
                  value={filters.industry || ''}
                  onChange={(e) => onChange({ ...filters, industry: e.target.value || undefined, page: 1 })}
                >
                  <option value="">All Industries</option>
                  {(options?.industries || [
                    'IT Services & Consulting',
                    'Software Development',
                    'Staffing & Recruiting',
                    'Cloud & Cybersecurity',
                    'Financial Services',
                    'Healthcare & Life Sciences',
                    'E-commerce & Retail',
                  ]).map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                  Location / City
                </label>
                <input
                  type="text"
                  id="filter-company-location"
                  className="input-field"
                  placeholder="e.g. Austin, Bangalore..."
                  value={filters.location || ''}
                  onChange={(e) => onChange({ ...filters, location: e.target.value || undefined, page: 1 })}
                />
              </div>

              {/* Employee Size */}
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                  Employee Size
                </label>
                <select
                  id="filter-company-employee-size"
                  className="input-field"
                  value={filters.employeeSize || ''}
                  onChange={(e) => onChange({ ...filters, employeeSize: e.target.value || undefined, page: 1 })}
                >
                  <option value="">All Sizes</option>
                  <option value="1-10">1-10 Employees</option>
                  <option value="11-50">11-50 Employees</option>
                  <option value="51-200">51-200 Employees</option>
                  <option value="201-500">201-500 Employees</option>
                  <option value="501-1000">501-1000 Employees</option>
                  <option value="1000+">1000+ Employees</option>
                </select>
              </div>

              {/* Hiring Volume */}
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                  Hiring Volume
                </label>
                <select
                  id="filter-company-hiring-volume"
                  className="input-field"
                  value={filters.hiringVolume || ''}
                  onChange={(e) => onChange({ ...filters, hiringVolume: e.target.value || undefined, page: 1 })}
                >
                  <option value="">All Volumes</option>
                  <option value="High">High Volume (15+ hires)</option>
                  <option value="Medium">Medium Volume (5-15)</option>
                  <option value="Low">Low Volume (1-5)</option>
                  <option value="None">None / Steady</option>
                </select>
              </div>

              {/* Product Fit */}
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                  Product Fit
                </label>
                <select
                  id="filter-company-product-fit"
                  className="input-field"
                  value={filters.productFit || ''}
                  onChange={(e) => onChange({ ...filters, productFit: e.target.value || undefined, page: 1 })}
                >
                  <option value="">All Fits</option>
                  <option value="High">High Product Fit</option>
                  <option value="Medium">Medium Product Fit</option>
                  <option value="Low">Low Product Fit</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Contact Filters */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-color)',
                marginBottom: '0.6rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <Users size={15} style={{ color: 'var(--primary-color)' }} />
              <span>Contact Filters</span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {/* Job Title */}
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                  Job Title
                </label>
                <input
                  type="text"
                  id="filter-contact-job-title"
                  className="input-field"
                  placeholder="e.g. VP People, Talent Head..."
                  value={filters.jobTitle || ''}
                  onChange={(e) => onChange({ ...filters, jobTitle: e.target.value || undefined, page: 1 })}
                />
              </div>

              {/* Company Name */}
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                  Company Name
                </label>
                <input
                  type="text"
                  id="filter-contact-company-name"
                  className="input-field"
                  placeholder="Filter by company name..."
                  value={filters.company || ''}
                  onChange={(e) => onChange({ ...filters, company: e.target.value || undefined, page: 1 })}
                />
              </div>

              {/* Decision-maker only */}
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                  Decision-Maker Role
                </label>
                <select
                  id="filter-contact-decision-maker"
                  className="input-field"
                  value={
                    filters.decisionMaker !== undefined ? String(filters.decisionMaker) : ''
                  }
                  onChange={(e) =>
                    onChange({
                      ...filters,
                      decisionMaker: e.target.value !== '' ? e.target.value : undefined,
                      page: 1,
                    })
                  }
                >
                  <option value="">All Contacts</option>
                  <option value="true">Decision-Makers Only ⭐</option>
                  <option value="false">Influencers & Specialists</option>
                </select>
              </div>

              {/* Product Relevance */}
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                  Product Relevance
                </label>
                <select
                  id="filter-contact-product-relevance"
                  className="input-field"
                  value={filters.productRelevance || ''}
                  onChange={(e) =>
                    onChange({ ...filters, productRelevance: e.target.value || undefined, page: 1 })
                  }
                >
                  <option value="">All Relevant Contacts</option>
                  <option value="Higher IQ">Higher IQ Prospects</option>
                  <option value="HRMS Portal">HRMS Portal Prospects</option>
                  <option value="Both">Both Solutions</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Existing HR & Recruitment Tool Filters */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-color)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <Wrench size={15} style={{ color: 'var(--primary-color)' }} />
                <span>Existing Tool Filters</span>
              </div>
              {selectedTools.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, existingTools: undefined, existingTool: undefined, page: 1 })}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-color)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Clear tools ({selectedTools.length})
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {existingToolList.map((tool) => {
                const isSelected = selectedTools.includes(tool);
                return (
                  <button
                    key={tool}
                    type="button"
                    id={`tool-filter-${tool.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    onClick={() => handleToggleTool(tool)}
                    style={{
                      padding: '5px 11px',
                      borderRadius: '16px',
                      fontSize: '0.78rem',
                      fontWeight: isSelected ? 600 : 500,
                      cursor: 'pointer',
                      border: isSelected ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-secondary)',
                      color: isSelected ? 'var(--primary-color)' : 'var(--text-color)',
                      transition: 'all 0.15s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {isSelected && <Star size={11} fill="currentColor" />}
                    <span>{tool}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 5: HireIQ Lead Signals */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-color)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <Sparkles size={15} style={{ color: '#3b82f6' }} />
                <span>HireIQ Lead Signals (Recruitment Velocity)</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {hireIqSignalList.map((sig) => {
                const isSelected = selectedSignals.includes(sig);
                return (
                  <button
                    key={sig}
                    type="button"
                    id={`signal-hireiq-${sig.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    onClick={() => handleToggleSignal(sig)}
                    style={{
                      padding: '5px 11px',
                      borderRadius: '16px',
                      fontSize: '0.78rem',
                      fontWeight: isSelected ? 600 : 500,
                      cursor: 'pointer',
                      border: isSelected ? '1px solid #3b82f6' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.18)' : 'var(--bg-secondary)',
                      color: isSelected ? '#2563eb' : 'var(--text-color)',
                      transition: 'all 0.15s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {isSelected && <Sparkles size={11} />}
                    <span>{sig}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 6: HRMS Lead Signals */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-color)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <Clock size={15} style={{ color: '#10b981' }} />
                <span>HRMS Lead Signals (Operational Inefficiency)</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {hrmsSignalList.map((sig) => {
                const isSelected = selectedSignals.includes(sig);
                return (
                  <button
                    key={sig}
                    type="button"
                    id={`signal-hrms-${sig.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    onClick={() => handleToggleSignal(sig)}
                    style={{
                      padding: '5px 11px',
                      borderRadius: '16px',
                      fontSize: '0.78rem',
                      fontWeight: isSelected ? 600 : 500,
                      cursor: 'pointer',
                      border: isSelected ? '1px solid #10b981' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.18)' : 'var(--bg-secondary)',
                      color: isSelected ? '#059669' : 'var(--text-color)',
                      transition: 'all 0.15s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {isSelected && <Clock size={11} />}
                    <span>{sig}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Summary Pills */}
      {activeFilterCount > 0 && (
        <div
          style={{
            marginTop: '0.85rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Applied Criteria:
          </span>

          {filters.search && (
            <span className="filter-pill" style={pillStyle}>
              Search: "{filters.search}"
              <X size={12} onClick={() => onChange({ ...filters, search: '', page: 1 })} style={{ cursor: 'pointer' }} />
            </span>
          )}

          {filters.product && (
            <span className="filter-pill" style={pillStyle}>
              Product: {filters.product}
              <X size={12} onClick={() => onChange({ ...filters, product: undefined, page: 1 })} style={{ cursor: 'pointer' }} />
            </span>
          )}

          {filters.priority && (
            <span className="filter-pill" style={pillStyle}>
              Priority: {filters.priority}
              <X size={12} onClick={() => onChange({ ...filters, priority: undefined, page: 1 })} style={{ cursor: 'pointer' }} />
            </span>
          )}

          {filters.status && (
            <span className="filter-pill" style={pillStyle}>
              Stage: {filters.status}
              <X size={12} onClick={() => onChange({ ...filters, status: undefined, page: 1 })} style={{ cursor: 'pointer' }} />
            </span>
          )}

          {filters.followUpStatus && (
            <span className="filter-pill" style={pillStyle}>
              Follow-up: {filters.followUpStatus}
              <X size={12} onClick={() => onChange({ ...filters, followUpStatus: undefined, page: 1 })} style={{ cursor: 'pointer' }} />
            </span>
          )}

          {filters.industry && (
            <span className="filter-pill" style={pillStyle}>
              Industry: {filters.industry}
              <X size={12} onClick={() => onChange({ ...filters, industry: undefined, page: 1 })} style={{ cursor: 'pointer' }} />
            </span>
          )}

          {filters.employeeSize && (
            <span className="filter-pill" style={pillStyle}>
              Size: {filters.employeeSize}
              <X size={12} onClick={() => onChange({ ...filters, employeeSize: undefined, page: 1 })} style={{ cursor: 'pointer' }} />
            </span>
          )}

          {filters.hiringVolume && (
            <span className="filter-pill" style={pillStyle}>
              Volume: {filters.hiringVolume}
              <X size={12} onClick={() => onChange({ ...filters, hiringVolume: undefined, page: 1 })} style={{ cursor: 'pointer' }} />
            </span>
          )}

          {filters.decisionMaker === 'true' && (
            <span className="filter-pill" style={pillStyle}>
              Decision-Maker Only ⭐
              <X size={12} onClick={() => onChange({ ...filters, decisionMaker: undefined, page: 1 })} style={{ cursor: 'pointer' }} />
            </span>
          )}

          {selectedTools.map((t) => (
            <span key={t} className="filter-pill" style={{ ...pillStyle, borderColor: 'var(--primary-color)' }}>
              Tool: {t}
              <X size={12} onClick={() => handleToggleTool(t)} style={{ cursor: 'pointer' }} />
            </span>
          ))}

          {selectedSignals.map((s) => (
            <span key={s} className="filter-pill" style={{ ...pillStyle, borderColor: '#8b5cf6' }}>
              Signal: {s}
              <X size={12} onClick={() => handleToggleSignal(s)} style={{ cursor: 'pointer' }} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const pillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '2px 8px',
  borderRadius: '12px',
  fontSize: '0.73rem',
  fontWeight: 500,
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-secondary)',
  color: 'var(--text-color)',
};
