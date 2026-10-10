/// <reference path="../../types/jsx.d.ts" />
import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  X,
  Search,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Download,
  Database,
  Send,
  Loader2,
  ChevronRight,
  Building,
  Link as LinkIcon,
  ShieldCheck,
} from 'lucide-react';
import { discoveryService } from '../../api';
import { HunterProspectingTab } from './HunterProspectingTab';
import {
  DiscoveredLead,
  DiscoveryJob,
  DiscoveredContactEmail,
  DiscoveredContactPhone,
  ExtractionStatus,
} from '../../types';

interface AutoDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadsSaved?: () => void;
}

const CATEGORY_SUGGESTIONS = [
  'Software Development',
  'IT Services & Consulting',
  'Healthcare & Clinics',
  'Accounting & Financial Services',
  'Law Firms & Legal',
  'Digital Marketing Agency',
  'Dentist Clinic',
  'Logistics & Freight',
  'Architecture & Design',
  'Cloud & Cybersecurity',
];

const LOCATION_SUGGESTIONS = [
  'Austin, TX',
  'San Francisco, CA',
  'New York, NY',
  'London, UK',
  'Bengaluru, India',
  'Berlin, Germany',
  'Toronto, Canada',
  'Sydney, Australia',
];

export const AutoDiscoveryModal: React.FC<AutoDiscoveryModalProps> = ({
  isOpen,
  onClose,
  onLeadsSaved,
}) => {
  // Discovery mode tab: Hunter.io B2B Prospecting vs Built-in Web Crawler
  const [activeEngineTab, setActiveEngineTab] = useState<'hunter' | 'crawler'>('hunter');

  // Input fields (user only provides these 3)
  const [category, setCategory] = useState('Software Development');
  const [location, setLocation] = useState('Austin, TX');
  const [maxResults, setMaxResults] = useState(10);
  const [autoSaveToCrm, setAutoSaveToCrm] = useState(false);

  // Discovery execution state
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [currentJob, setCurrentJob] = useState<DiscoveryJob | null>(null);
  const [leads, setLeads] = useState<DiscoveredLead[]>([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [stage, setStage] = useState<'idle' | 'discovering' | 'enriching' | 'completed' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  // Results filtering & search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ExtractionStatus>('all');
  const [contactFilter, setContactFilter] = useState<'all' | 'has_email' | 'has_phone' | 'has_both'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Save to CRM & Outreach action state
  const [isSavingCrm, setIsSavingCrm] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [outreachLead, setOutreachLead] = useState<DiscoveredLead | null>(null);
  const [outreachSubject, setOutreachSubject] = useState('');
  const [outreachBody, setOutreachBody] = useState('');
  const [outreachSent, setOutreachSent] = useState(false);

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen && stage === 'idle') {
      // Check if there are recent jobs
      discoveryService.getDiscoveryJobs(1).then((res) => {
        if (res.data && res.data.length > 0) {
          const latest = res.data[0];
          discoveryService.getDiscoveryJobDetails(latest.id).then((dRes) => {
            if (dRes.data) {
              setCurrentJob(dRes.data.job);
              setLeads(dRes.data.leads);
              setStage('completed');
              setProgressPercent(100);
            }
          });
        }
      }).catch(() => {});
    }
  }, [isOpen, stage]);

  const handleStartDiscovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.trim() || !location.trim()) {
      setErrorMessage('Please provide both Business Category and Target Location');
      return;
    }

    setIsDiscovering(true);
    setErrorMessage(null);
    setSaveSuccessMsg(null);
    setLeads([]);
    setCurrentJob(null);
    setProgressPercent(5);
    setProgressMessage(`Initiating Stage A discovery for "${category}" in "${location}"...`);
    setStage('discovering');
    setSelectedLeadIds(new Set());
    setCurrentPage(1);

    try {
      // Execute the discovery request
      const response = await discoveryService.startAutoDiscovery({
        category: category.trim(),
        location: location.trim(),
        maxResults,
        autoSave: autoSaveToCrm,
      });

      if (response.data) {
        setCurrentJob(response.data.job);
        setLeads(response.data.leads || []);
        setProgressPercent(100);
        setProgressMessage(`Discovery complete! Processed ${response.data.leads.length} companies.`);
        setStage('completed');
        if (autoSaveToCrm && onLeadsSaved) {
          onLeadsSaved();
        }
      } else {
        throw new Error(response.message || 'No data returned from discovery service');
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setStage('failed');
      setErrorMessage(error.message || 'Discovery workflow failed. Please check your network or try another query.');
      setProgressPercent(0);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeadIds(new Set(filteredLeads.map((l) => l.id)));
    } else {
      setSelectedLeadIds(new Set());
    }
  };

  const toggleSelectLead = (id: string) => {
    const updated = new Set(selectedLeadIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedLeadIds(updated);
  };

  const handleSaveSelectedToCrm = async () => {
    if (!currentJob || selectedLeadIds.size === 0) return;
    setIsSavingCrm(true);
    setSaveSuccessMsg(null);
    try {
      const res = await discoveryService.saveLeadsToCrm(currentJob.id, Array.from(selectedLeadIds));
      if (res.data) {
        setSaveSuccessMsg(`Successfully saved ${res.data.savedCount} leads into your CRM database!`);
        // Refresh leads to update saved status
        const refreshed = await discoveryService.getDiscoveryJobDetails(currentJob.id);
        if (refreshed.data) {
          setLeads(refreshed.data.leads);
        }
        if (onLeadsSaved) onLeadsSaved();
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setErrorMessage(e.message || 'Failed to save leads to CRM');
    } finally {
      setIsSavingCrm(false);
    }
  };

  const handleExportCsv = () => {
    if (!currentJob) return;
    const url = discoveryService.getExportCsvUrl(currentJob.id);
    window.open(url, '_blank');
  };

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search filter
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const matchesName = lead.company_name.toLowerCase().includes(s);
        const matchesDomain = lead.domain.toLowerCase().includes(s);
        const matchesLoc = lead.location.toLowerCase().includes(s);
        const emails: DiscoveredContactEmail[] = lead.emails ? JSON.parse(lead.emails) : [];
        const matchesEmail = emails.some((e) => e.email.toLowerCase().includes(s));
        if (!matchesName && !matchesDomain && !matchesLoc && !matchesEmail) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (lead.extraction_status !== statusFilter) return false;
      }

      // Contact availability filter
      const emails: DiscoveredContactEmail[] = lead.emails ? JSON.parse(lead.emails) : [];
      const phones: DiscoveredContactPhone[] = lead.phones ? JSON.parse(lead.phones) : [];

      if (contactFilter === 'has_email' && emails.length === 0) return false;
      if (contactFilter === 'has_phone' && phones.length === 0) return false;
      if (contactFilter === 'has_both' && (emails.length === 0 || phones.length === 0)) return false;

      return true;
    });
  }, [leads, searchTerm, statusFilter, contactFilter]);

  // Paginated leads
  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, currentPage, pageSize]);

  // Quick stats
  const stats = useMemo(() => {
    let emailsCount = 0;
    let phonesCount = 0;
    let enrichedCount = 0;
    for (const l of leads) {
      const em: DiscoveredContactEmail[] = l.emails ? JSON.parse(l.emails) : [];
      const ph: DiscoveredContactPhone[] = l.phones ? JSON.parse(l.phones) : [];
      if (em.length > 0) emailsCount++;
      if (ph.length > 0) phonesCount++;
      if (l.extraction_status === 'completed') enrichedCount++;
    }
    return {
      total: leads.length,
      withEmails: emailsCount,
      withPhones: phonesCount,
      enriched: enrichedCount,
    };
  }, [leads]);

  const openOutreachModal = (lead: DiscoveredLead) => {
    setOutreachLead(lead);
    setOutreachSent(false);
    const emails: DiscoveredContactEmail[] = lead.emails ? JSON.parse(lead.emails) : [];
    const contactRecipient = emails[0]?.email || 'contact@' + lead.domain;
    setOutreachSubject(`Partnership & Talent Solutions for ${lead.company_name}`);
    setOutreachBody(
      `Hello ${lead.company_name} team (${contactRecipient}),\n\nI noticed your leading work in ${lead.category} across ${lead.location}. We specialize in enterprise IT talent mapping and HR process automation.\n\nWould you be open to a brief 10-minute discovery call next week?\n\nBest regards,\nLead Generation Team`
    );
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card, #1e293b)',
          border: '1px solid var(--border-color, #334155)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '1150px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid var(--border-color, #334155)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.8) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa',
              }}
            >
              <Compass size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main, #f8fafc)' }}>
                  Automatic Company Lead Discovery
                </h2>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                >
                  Stage A & B Automated
                </span>
              </div>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted, #94a3b8)', margin: '2px 0 0' }}>
                Discover real companies, inspect official websites, and extract verified business emails & phone numbers.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-icon-only btn-secondary"
            aria-label="Close"
            style={{ borderRadius: '8px', padding: '0.4rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Engine Selection Tab Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0 1.75rem',
            borderBottom: '1px solid var(--border-color, #334155)',
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveEngineTab('hunter')}
            style={{
              padding: '12px 18px',
              border: 'none',
              borderBottom: activeEngineTab === 'hunter' ? '2px solid #3b82f6' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeEngineTab === 'hunter' ? '#60a5fa' : 'var(--text-muted)',
              fontWeight: activeEngineTab === 'hunter' ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            <ShieldCheck size={16} />
            <span>Hunter.io B2B Prospecting (Official API)</span>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '999px',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              Hunter API v2
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveEngineTab('crawler')}
            style={{
              padding: '12px 18px',
              border: 'none',
              borderBottom: activeEngineTab === 'crawler' ? '2px solid #3b82f6' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeEngineTab === 'crawler' ? '#60a5fa' : 'var(--text-muted)',
              fontWeight: activeEngineTab === 'crawler' ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            <Compass size={16} />
            <span>Multi-Source Web Discovery & Scraping</span>
          </button>
        </div>

        {activeEngineTab === 'hunter' ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            <HunterProspectingTab onLeadsSaved={onLeadsSaved} />
          </div>
        ) : (
          /* Main Body */
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Top Form: Business Category, Target Location, Max Number */}
          <form
            onSubmit={handleStartDiscovery}
            style={{
              padding: '1.25rem',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '12px',
              border: '1px solid var(--border-color, #334155)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {/* 1. Business Category */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#e2e8f0' }}>
                  1. Business Category <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Software Development, Accounting, Dentists"
                  value={category}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCategory(e.target.value)}
                  disabled={isDiscovering}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                    borderRadius: '8px',
                    border: '1px solid #475569',
                    color: '#f8fafc',
                  }}
                />
                {/* Suggestions chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
                  {CATEGORY_SUGGESTIONS.slice(0, 5).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      disabled={isDiscovering}
                      style={{
                        fontSize: '0.725rem',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: category === cat ? 'rgba(59, 130, 246, 0.25)' : 'rgba(51, 65, 85, 0.5)',
                        border: category === cat ? '1px solid #3b82f6' : '1px solid rgba(148, 163, 184, 0.2)',
                        color: category === cat ? '#93c5fd' : '#cbd5e1',
                        cursor: 'pointer',
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Target Location */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#e2e8f0' }}>
                  2. Target Location <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Austin, TX or London, UK or Bengaluru"
                    value={location}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocation(e.target.value)}
                    disabled={isDiscovering}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem 0.65rem 2.2rem',
                      backgroundColor: 'rgba(30, 41, 59, 0.8)',
                      borderRadius: '8px',
                      border: '1px solid #475569',
                      color: '#f8fafc',
                    }}
                  />
                  <MapPin size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                </div>
                {/* Suggestions chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
                  {LOCATION_SUGGESTIONS.slice(0, 5).map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setLocation(loc)}
                      disabled={isDiscovering}
                      style={{
                        fontSize: '0.725rem',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: location === loc ? 'rgba(16, 185, 129, 0.25)' : 'rgba(51, 65, 85, 0.5)',
                        border: location === loc ? '1px solid #10b981' : '1px solid rgba(148, 163, 184, 0.2)',
                        color: location === loc ? '#6ee7b7' : '#cbd5e1',
                        cursor: 'pointer',
                      }}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Desired Maximum Number of Companies */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>
                    3. Max Companies: <span style={{ color: '#60a5fa' }}>{maxResults}</span>
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>1 to 50</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="50"
                  step="1"
                  value={maxResults}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxResults(Number(e.target.value))}
                  disabled={isDiscovering}
                  style={{ width: '100%', accentColor: '#3b82f6', height: '6px', cursor: 'pointer' }}
                />

                <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="autoSaveCheckbox"
                    checked={autoSaveToCrm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAutoSaveToCrm(e.target.checked)}
                    disabled={isDiscovering}
                    style={{ accentColor: '#3b82f6', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="autoSaveCheckbox" style={{ fontSize: '0.8rem', color: '#cbd5e1', cursor: 'pointer', margin: 0 }}>
                    Automatically save to CRM pipeline on completion
                  </label>
                </div>
              </div>
            </div>

            {/* Launch Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
              <button
                type="submit"
                disabled={isDiscovering}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.75rem 1.75rem',
                  borderRadius: '10px',
                  backgroundColor: '#2563eb',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.925rem',
                  cursor: isDiscovering ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.4)',
                  transition: 'all 0.2s ease',
                }}
              >
                {isDiscovering ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Discovering & Enriching...</span>
                  </>
                ) : (
                  <>
                    <Compass size={18} />
                    <span>Start Automatic Discovery</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Live Progress Bar & Stepper when running */}
          {(isDiscovering || stage !== 'idle') && (
            <div
              style={{
                padding: '1.25rem',
                backgroundColor: 'rgba(30, 41, 59, 0.5)',
                borderRadius: '12px',
                border: '1px solid var(--border-color, #334155)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}
            >
              {/* Stepper info */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: stage === 'discovering' ? '#60a5fa' : '#34d399' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: stage === 'discovering' ? '#60a5fa' : '#34d399' }} />
                    Stage A: Company Discovery
                  </div>
                  <ChevronRight size={14} style={{ color: '#64748b' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: stage === 'enriching' ? '#fbbf24' : stage === 'completed' ? '#34d399' : '#64748b' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: stage === 'enriching' ? '#fbbf24' : stage === 'completed' ? '#34d399' : '#64748b' }} />
                    Stage B: Contact Enrichment
                  </div>
                </div>

                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                  {progressPercent}%
                </div>
              </div>

              {/* Progress track */}
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  borderRadius: '999px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progressPercent}%`,
                    background: stage === 'failed' ? '#ef4444' : 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)',
                    borderRadius: '999px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              {/* Live Log Message */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', color: '#94a3b8' }}>
                {isDiscovering && <Loader2 size={14} className="animate-spin" style={{ color: '#3b82f6' }} />}
                <span>{progressMessage || 'Idle'}</span>
              </div>
            </div>
          )}

          {/* Feedback Alerts */}
          {errorMessage && (
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#fca5a5',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {saveSuccessMsg && (
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#6ee7b7',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <CheckCircle2 size={18} />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* Results Section */}
          {leads.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Stats Counters */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                <div style={{ padding: '0.85rem 1rem', backgroundColor: 'rgba(30, 41, 59, 0.6)', borderRadius: '10px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Discovered</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>{stats.total}</div>
                </div>
                <div style={{ padding: '0.85rem 1rem', backgroundColor: 'rgba(30, 41, 59, 0.6)', borderRadius: '10px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>With Direct Emails</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#38bdf8' }}>{stats.withEmails}</div>
                </div>
                <div style={{ padding: '0.85rem 1rem', backgroundColor: 'rgba(30, 41, 59, 0.6)', borderRadius: '10px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>With Phone Numbers</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#a78bfa' }}>{stats.withPhones}</div>
                </div>
                <div style={{ padding: '0.85rem 1rem', backgroundColor: 'rgba(30, 41, 59, 0.6)', borderRadius: '10px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Successfully Enriched</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#34d399' }}>{stats.enriched}</div>
                </div>
              </div>

              {/* Filter & Action Toolbar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'rgba(15, 23, 42, 0.5)',
                  borderRadius: '10px',
                  border: '1px solid #334155',
                }}
              >
                {/* Search & Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
                  <div style={{ position: 'relative', minWidth: '220px' }}>
                    <input
                      type="text"
                      placeholder="Search company, domain, email..."
                      value={searchTerm}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                      style={{
                        padding: '0.45rem 0.75rem 0.45rem 2rem',
                        fontSize: '0.825rem',
                        backgroundColor: 'rgba(30, 41, 59, 0.8)',
                        borderRadius: '6px',
                        border: '1px solid #475569',
                        color: '#f8fafc',
                        width: '100%',
                      }}
                    />
                    <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value as any)}
                    style={{
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.825rem',
                      backgroundColor: 'rgba(30, 41, 59, 0.8)',
                      borderRadius: '6px',
                      border: '1px solid #475569',
                      color: '#f8fafc',
                    }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="completed">Completed (Contacts Found)</option>
                    <option value="no_contacts">No Contacts Listed</option>
                    <option value="website_unavailable">Website Unavailable</option>
                  </select>

                  <select
                    value={contactFilter}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setContactFilter(e.target.value as any)}
                    style={{
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.825rem',
                      backgroundColor: 'rgba(30, 41, 59, 0.8)',
                      borderRadius: '6px',
                      border: '1px solid #475569',
                      color: '#f8fafc',
                    }}
                  >
                    <option value="all">All Contacts</option>
                    <option value="has_email">Has Email</option>
                    <option value="has_phone">Has Phone</option>
                    <option value="has_both">Has Both</option>
                  </select>
                </div>

                {/* Batch Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={handleExportCsv}
                    className="btn btn-secondary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 0.85rem',
                      fontSize: '0.825rem',
                      borderRadius: '6px',
                    }}
                  >
                    <Download size={14} />
                    <span>Export CSV</span>
                  </button>

                  <button
                    onClick={handleSaveSelectedToCrm}
                    disabled={selectedLeadIds.size === 0 || isSavingCrm}
                    className="btn btn-primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 0.85rem',
                      fontSize: '0.825rem',
                      borderRadius: '6px',
                      opacity: selectedLeadIds.size === 0 ? 0.6 : 1,
                    }}
                  >
                    {isSavingCrm ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
                    <span>Save {selectedLeadIds.size > 0 ? `(${selectedLeadIds.size})` : ''} to CRM</span>
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div
                style={{
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  backgroundColor: 'rgba(15, 23, 42, 0.4)',
                }}
              >
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                        <th style={{ padding: '0.75rem 1rem', width: '40px' }}>
                          <input
                            type="checkbox"
                            checked={filteredLeads.length > 0 && selectedLeadIds.size === filteredLeads.length}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSelectAll(e.target.checked)}
                            style={{ accentColor: '#3b82f6', cursor: 'pointer' }}
                          />
                        </th>
                        <th style={{ padding: '0.75rem 1rem' }}>Company & Website</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Location</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Email Addresses</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Phone Numbers</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Address</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Source URLs</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Extraction Status</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLeads.map((lead) => {
                        const emails: DiscoveredContactEmail[] = lead.emails ? JSON.parse(lead.emails) : [];
                        const phones: DiscoveredContactPhone[] = lead.phones ? JSON.parse(lead.phones) : [];
                        const sourceUrls: string[] = lead.source_urls ? JSON.parse(lead.source_urls) : [];
                        const isSelected = selectedLeadIds.has(lead.id);

                        return (
                          <tr
                            key={lead.id}
                            style={{
                              borderBottom: '1px solid rgba(51, 65, 85, 0.6)',
                              backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                              transition: 'background-color 0.15s ease',
                            }}
                          >
                            {/* Checkbox */}
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectLead(lead.id)}
                                style={{ accentColor: '#3b82f6', cursor: 'pointer' }}
                              />
                            </td>

                            {/* Company Name & Website */}
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <div style={{ fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Building size={14} style={{ color: '#94a3b8' }} />
                                <span>{lead.company_name}</span>
                              </div>
                              <div style={{ marginTop: '2px' }}>
                                <a
                                  href={lead.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontSize: '0.75rem',
                                    color: '#60a5fa',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    textDecoration: 'none',
                                  }}
                                >
                                  <span>{lead.domain}</span>
                                  <ExternalLink size={11} />
                                </a>
                              </div>
                            </td>

                            {/* Location */}
                            <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <MapPin size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
                                <span>{lead.location}</span>
                              </div>
                            </td>

                            {/* Emails */}
                            <td style={{ padding: '0.75rem 1rem' }}>
                              {emails.length === 0 ? (
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Unavailable</span>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  {emails.slice(0, 2).map((em, idx) => (
                                    <div
                                      key={idx}
                                      title={`Status: ${em.status} | Source: ${em.sourceUrl}`}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        fontSize: '0.75rem',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        backgroundColor: em.status === 'verified' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                        border: em.status === 'verified' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
                                        color: em.status === 'verified' ? '#34d399' : '#60a5fa',
                                      }}
                                    >
                                      <Mail size={11} />
                                      <span>{em.email}</span>
                                    </div>
                                  ))}
                                  {emails.length > 2 && (
                                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                      +{emails.length - 2} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Phones */}
                            <td style={{ padding: '0.75rem 1rem' }}>
                              {phones.length === 0 ? (
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Unavailable</span>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  {phones.slice(0, 2).map((ph, idx) => (
                                    <a
                                      key={idx}
                                      href={`tel:${ph.phone}`}
                                      title={`Source: ${ph.sourceUrl}`}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        fontSize: '0.75rem',
                                        color: '#cbd5e1',
                                        textDecoration: 'none',
                                      }}
                                    >
                                      <Phone size={11} style={{ color: '#a78bfa' }} />
                                      <span>{ph.phone}</span>
                                    </a>
                                  ))}
                                </div>
                              )}
                            </td>

                            {/* Physical Address */}
                            <td style={{ padding: '0.75rem 1rem', maxWidth: '200px' }}>
                              {lead.address ? (
                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    color: '#94a3b8',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                  }}
                                  title={lead.address}
                                >
                                  {lead.address}
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Unavailable</span>
                              )}
                            </td>

                            {/* Source URLs */}
                            <td style={{ padding: '0.75rem 1rem' }}>
                              {sourceUrls.length === 0 ? (
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>None</span>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  {sourceUrls.slice(0, 2).map((sUrl, sIdx) => (
                                    <a
                                      key={sIdx}
                                      href={sUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title={sUrl}
                                      style={{
                                        fontSize: '0.725rem',
                                        color: '#38bdf8',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        textDecoration: 'none',
                                        maxWidth: '160px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      <LinkIcon size={10} />
                                      <span>{sUrl.replace(/^https?:\/\//i, '')}</span>
                                    </a>
                                  ))}
                                  {sourceUrls.length > 2 && (
                                    <span style={{ fontSize: '0.675rem', color: '#94a3b8' }}>
                                      +{sourceUrls.length - 2} more pages
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Extraction Status */}
                            <td style={{ padding: '0.75rem 1rem' }}>
                              {lead.extraction_status === 'completed' && (
                                <span
                                  style={{
                                    fontSize: '0.725rem',
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                    color: '#34d399',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                  }}
                                >
                                  Completed
                                </span>
                              )}
                              {lead.extraction_status === 'no_contacts' && (
                                <span
                                  style={{
                                    fontSize: '0.725rem',
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                    color: '#fbbf24',
                                    border: '1px solid rgba(245, 158, 11, 0.3)',
                                  }}
                                >
                                  No Contacts
                                </span>
                              )}
                              {lead.extraction_status === 'website_unavailable' && (
                                <span
                                  style={{
                                    fontSize: '0.725rem',
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    backgroundColor: 'rgba(244, 63, 94, 0.15)',
                                    color: '#fb7185',
                                    border: '1px solid rgba(244, 63, 94, 0.3)',
                                  }}
                                  title={lead.extraction_error || 'Website unreachable'}
                                >
                                  Unavailable
                                </span>
                              )}
                              {lead.saved_to_crm === 1 && (
                                <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: '3px' }}>
                                  ✓ In CRM
                                </div>
                              )}
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                <button
                                  onClick={() => openOutreachModal(lead)}
                                  className="btn btn-icon-only btn-secondary"
                                  title="Quick Outreach Message"
                                  style={{ padding: '0.35rem', borderRadius: '6px' }}
                                >
                                  <Send size={14} style={{ color: '#38bdf8' }} />
                                </button>

                                {lead.saved_to_crm === 0 ? (
                                  <button
                                    onClick={() => {
                                      if (currentJob) {
                                        discoveryService.saveLeadsToCrm(currentJob.id, [lead.id]).then(() => {
                                          setSaveSuccessMsg(`Saved ${lead.company_name} to CRM!`);
                                          discoveryService.getDiscoveryJobDetails(currentJob.id).then((r) => {
                                            if (r.data) setLeads(r.data.leads);
                                          });
                                          if (onLeadsSaved) onLeadsSaved();
                                        });
                                      }
                                    }}
                                    className="btn btn-icon-only btn-secondary"
                                    title="Save to CRM database"
                                    style={{ padding: '0.35rem', borderRadius: '6px' }}
                                  >
                                    <Database size={14} style={{ color: '#34d399' }} />
                                  </button>
                                ) : (
                                  <span title="Already saved to CRM" style={{ padding: '0.35rem', color: '#10b981' }}>
                                    <CheckCircle2 size={16} />
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination bar */}
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                    borderTop: '1px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Showing {(currentPage - 1) * pageSize + 1} -{' '}
                    {Math.min(currentPage * pageSize, filteredLeads.length)} of {filteredLeads.length} leads
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '4px' }}
                    >
                      Previous
                    </button>
                    <span style={{ fontSize: '0.8rem', color: '#f8fafc' }}>
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '4px' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Outreach Quick Compose Sub-Modal */}
        {outreachLead && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              zIndex: 1200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
          >
            <div
              style={{
                backgroundColor: 'var(--bg-card, #1e293b)',
                border: '1px solid #334155',
                borderRadius: '12px',
                width: '100%',
                maxWidth: '560px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Send size={18} style={{ color: '#38bdf8' }} />
                  Outreach to {outreachLead.company_name}
                </h3>
                <button onClick={() => setOutreachLead(null)} className="btn btn-icon-only btn-secondary">
                  <X size={16} />
                </button>
              </div>

              {outreachSent ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#34d399' }}>
                  <CheckCircle2 size={40} style={{ margin: '0 auto 0.75rem' }} />
                  <div style={{ fontWeight: 600 }}>Outreach initiated successfully!</div>
                  <button
                    onClick={() => setOutreachLead(null)}
                    className="btn btn-secondary"
                    style={{ marginTop: '1rem' }}
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                      Subject
                    </label>
                    <input
                      type="text"
                      value={outreachSubject}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOutreachSubject(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: '#f8fafc',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                      Message Content
                    </label>
                    <textarea
                      rows={5}
                      value={outreachBody}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setOutreachBody(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button onClick={() => setOutreachLead(null)} className="btn btn-secondary">
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const emails: DiscoveredContactEmail[] = outreachLead.emails ? JSON.parse(outreachLead.emails) : [];
                        const dest = emails[0]?.email || '';
                        window.open(
                          `mailto:${dest}?subject=${encodeURIComponent(outreachSubject)}&body=${encodeURIComponent(outreachBody)}`
                        );
                        setOutreachSent(true);
                      }}
                      className="btn btn-primary"
                    >
                      <Send size={14} style={{ marginRight: '0.35rem' }} />
                      Launch Outreach
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
