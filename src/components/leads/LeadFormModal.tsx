import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  Lead,
  CreateLeadPayload,
  ProductType,
  LeadPriority,
  LeadStatus,
  Company,
  Contact,
  QualificationPreviewResult,
} from '../../types';
import { companyService, contactService, leadService } from '../../api';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';

export interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateLeadPayload) => Promise<void>;
  leadToEdit?: Lead | null;
  initialCompanyId?: string;
  initialContactId?: string;
}

const PRODUCTS: ProductType[] = ['Higher IQ', 'HRMS Portal', 'Both'];

const STAGES: LeadStatus[] = [
  'New',
  'Contacted',
  'Replied',
  'Demo Booked',
  'Demo Done',
  'Won',
  'Lost',
];

const HIRING_VOLUMES: Array<'High' | 'Medium' | 'Low' | 'None'> = [
  'High',
  'Medium',
  'Low',
  'None',
];

const COMPANY_SIZES = [
  '1-10 employees (Startup)',
  '11-50 employees (Early Growth)',
  '51-200 employees (Mid Market)',
  '201-500 employees (Upper Mid)',
  '501-1000 employees (Enterprise)',
  '1000+ employees (Large Enterprise)',
];

export const LeadFormModal: React.FC<LeadFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  leadToEdit,
  initialCompanyId,
  initialContactId,
}) => {
  const isEditing = Boolean(leadToEdit);

  // Primary Fields
  const [title, setTitle] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [contactId, setContactId] = useState<string>('');
  const [product, setProduct] = useState<ProductType>('Higher IQ');
  const [value, setValue] = useState<number>(50000);
  const [status, setStatus] = useState<LeadStatus>('New');
  const [requestedPriority, setRequestedPriority] = useState<LeadPriority>('High');

  // Qualification Signals
  const [hiringVolume, setHiringVolume] = useState<'High' | 'Medium' | 'Low' | 'None'>('High');
  const [hiringMultipleRoles, setHiringMultipleRoles] = useState(true);
  const [manualHrProcesses, setManualHrProcesses] = useState(true);
  const [existingTools, setExistingTools] = useState('Excel, Manual Google Sheets');
  const [companySize, setCompanySize] = useState(COMPANY_SIZES[2]);
  const [decisionMakerIdentified, setDecisionMakerIdentified] = useState(true);
  const [qualificationNotes, setQualificationNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  // Async dropdown data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyContacts, setCompanyContacts] = useState<Contact[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Live Backend Qualification Preview
  const [preview, setPreview] = useState<QualificationPreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Duplicate Check
  const [duplicateWarning, setDuplicateWarning] = useState<{
    id: string;
    title: string;
    product: string;
    status: string;
    companyName: string;
  } | null>(null);

  // Form Submission
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or reset on open
  useEffect(() => {
    if (!isOpen) return;

    if (leadToEdit) {
      setTitle(leadToEdit.title);
      setCompanyId(leadToEdit.companyId);
      setContactId(leadToEdit.contactId || '');
      setProduct(leadToEdit.product);
      setValue(leadToEdit.value || 0);
      setStatus(leadToEdit.status);
      setRequestedPriority(leadToEdit.priority);
      setHiringVolume(leadToEdit.hiringVolume || 'High');
      setHiringMultipleRoles(leadToEdit.hiringMultipleRoles ?? true);
      setManualHrProcesses(leadToEdit.manualHrProcesses ?? true);
      setExistingTools(leadToEdit.existingTools || '');
      setCompanySize(leadToEdit.companySize || COMPANY_SIZES[2]);
      setDecisionMakerIdentified(leadToEdit.decisionMakerIdentified ?? true);
      setQualificationNotes(leadToEdit.qualificationNotes || '');
      setNotes(leadToEdit.notes || '');
      setAllowDuplicate(false);
      setDuplicateWarning(null);
      setError(null);
    } else {
      const defaultComp = initialCompanyId || '';
      setTitle('Enterprise Automation & Workforce Onboarding');
      setCompanyId(defaultComp);
      setContactId(initialContactId || '');
      setProduct('Higher IQ');
      setValue(75000);
      setStatus('New');
      setRequestedPriority('High');
      setHiringVolume('High');
      setHiringMultipleRoles(true);
      setManualHrProcesses(true);
      setExistingTools('Legacy spreadsheets, no ATS');
      setCompanySize(COMPANY_SIZES[2]);
      setDecisionMakerIdentified(true);
      setQualificationNotes('');
      setNotes('');
      setAllowDuplicate(false);
      setDuplicateWarning(null);
      setError(null);
    }
  }, [isOpen, leadToEdit, initialCompanyId, initialContactId]);

  // Load Companies list
  useEffect(() => {
    if (!isOpen) return;
    setLoadingCompanies(true);
    companyService
      .getCompanies({ limit: 100 })
      .then((res) => {
        if (res.data?.items) {
          setCompanies(res.data.items);
          if (!companyId && !leadToEdit && res.data.items.length > 0) {
            setCompanyId(initialCompanyId || res.data.items[0].id);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCompanies(false));
  }, [isOpen, initialCompanyId, leadToEdit, companyId]);

  // Load Contacts for Selected Company
  useEffect(() => {
    if (!companyId) {
      setCompanyContacts([]);
      return;
    }
    setLoadingContacts(true);
    contactService
      .getContacts({ companyId, limit: 100 })
      .then((res) => {
        const list = res.data?.items || [];
        setCompanyContacts(list);

        // If no contact selected, auto-select a decision maker if available
        if (!contactId && list.length > 0) {
          const dm = list.find((c) => c.decisionMaker);
          if (dm) {
            setContactId(dm.id);
            setDecisionMakerIdentified(true);
          } else {
            setContactId(list[0].id);
          }
        }
      })
      .catch(() => setCompanyContacts([]))
      .finally(() => setLoadingContacts(false));
  }, [companyId, contactId]);

  // Sync decisionMakerIdentified flag when contact is chosen
  const handleContactChange = (newContactId: string) => {
    setContactId(newContactId);
    if (!newContactId) {
      setDecisionMakerIdentified(false);
      return;
    }
    const found = companyContacts.find((c) => c.id === newContactId);
    if (found) {
      setDecisionMakerIdentified(Boolean(found.decisionMaker));
    }
  };

  // Live Backend Preview Calculation: Triggers whenever qualification signals or contact change
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await leadService.previewQualification(
          {
            product,
            priority: requestedPriority,
            hiringVolume,
            hiringMultipleRoles,
            manualHrProcesses,
            existingTools,
            companySize,
            decisionMakerIdentified,
            qualificationNotes,
          },
          companyId || undefined,
          contactId || null
        );

        if (res.data) {
          setPreview(res.data);
        }
      } catch {
        // Fallback or ignore network interruption
      } finally {
        setPreviewLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [
    isOpen,
    companyId,
    contactId,
    product,
    requestedPriority,
    hiringVolume,
    hiringMultipleRoles,
    manualHrProcesses,
    existingTools,
    companySize,
    decisionMakerIdentified,
    qualificationNotes,
  ]);

  // Duplicate Check on Company + Product change
  useEffect(() => {
    if (!isOpen || !companyId || !product) {
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await leadService.checkDuplicate(
          companyId,
          product,
          leadToEdit?.id
        );
        if (res.data?.isDuplicate && res.data.existingLead) {
          setDuplicateWarning(res.data.existingLead);
        } else {
          setDuplicateWarning(null);
        }
      } catch {
        setDuplicateWarning(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isOpen, companyId, product, leadToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Lead title is required.');
      return;
    }
    if (!companyId) {
      setError('Please select a company.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: CreateLeadPayload = {
        companyId,
        contactId: contactId || null,
        product,
        title: title.trim(),
        value: Number(value) || 0,
        status,
        priority: requestedPriority,
        hiringVolume,
        hiringMultipleRoles,
        manualHrProcesses,
        existingTools: existingTools.trim() || null,
        companySize: companySize.trim() || null,
        decisionMakerIdentified,
        qualificationNotes: qualificationNotes.trim() || null,
        notes: notes.trim() || null,
        allowDuplicate,
      };

      await onSubmit(payload);
      onClose();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to save lead.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedContact = companyContacts.find((c) => c.id === contactId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Qualified Lead' : 'Create & Qualify New Lead'}
      maxWidth="860px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} style={{ color: 'var(--primary-color)' }} />
            <span>Backend engine enforces fit & contact verification rules</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="lead-qualification-form"
              className="btn btn-primary"
              disabled={submitting}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Saving Lead...</span>
                </>
              ) : (
                <span>{isEditing ? 'Save Changes' : 'Create Qualified Lead'}</span>
              )}
            </button>
          </div>
        </div>
      }
    >
      <form id="lead-qualification-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.875rem',
            }}
          >
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Duplicate Warning Alert */}
        {duplicateWarning && (
          <div
            style={{
              padding: '0.875rem 1rem',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '8px',
              color: 'var(--status-warning-text, #b45309)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <AlertTriangle size={16} />
              <span>Duplicate Active Lead Detected</span>
            </div>
            <div>
              An active lead already exists for <strong>{duplicateWarning.companyName}</strong> under the <strong>{duplicateWarning.product}</strong> solution ({duplicateWarning.title} - {duplicateWarning.status}).
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', cursor: 'pointer', fontSize: '0.8125rem' }}>
              <input
                type="checkbox"
                checked={allowDuplicate}
                onChange={(e) => setAllowDuplicate(e.target.checked)}
              />
              <span>I confirm I want to create another concurrent opportunity for this product</span>
            </label>
          </div>
        )}

        {/* SECTION 1: OPPORTUNITY BASICS & RELATIONSHIPS */}
        <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', backgroundColor: 'var(--bg-card)' }}>
          <h4 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.875rem', fontWeight: 700 }}>
            1. Account & Opportunity Basics
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {/* Title */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                Opportunity Title *
              </label>
              <input
                type="text"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Higher IQ Assessment Rollout - Enterprise"
                required
              />
            </div>

            {/* Company Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                Target Company * {loadingCompanies && <Loader2 size={12} className="spin" style={{ display: 'inline', marginLeft: 4 }} />}
              </label>
              <select
                className="input"
                value={companyId}
                onChange={(e) => {
                  setCompanyId(e.target.value);
                  setContactId('');
                }}
                disabled={loadingCompanies || (isEditing && Boolean(leadToEdit))}
                required
              >
                <option value="">Select target company...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.industry ? `(${c.industry})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Contact / Decision Maker Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                Primary Contact {loadingContacts && <Loader2 size={12} className="spin" style={{ display: 'inline', marginLeft: 4 }} />}
              </label>
              <select
                className="input"
                value={contactId}
                onChange={(e) => handleContactChange(e.target.value)}
                disabled={!companyId || loadingContacts}
              >
                <option value="">-- No Contact Attached Yet --</option>
                {companyContacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.decisionMaker ? '⭐ ' : ''}{c.name} — {c.title}
                  </option>
                ))}
              </select>
              {selectedContact && (
                <div style={{ marginTop: '4px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', color: selectedContact.decisionMaker ? '#f59e0b' : 'var(--text-muted)' }}>
                  {selectedContact.decisionMaker ? (
                    <>
                      <Star size={12} fill="#f59e0b" />
                      <strong>Verified Decision Maker</strong> ({selectedContact.email || 'No email'})
                    </>
                  ) : (
                    <span>Non-decision maker role ({selectedContact.title})</span>
                  )}
                </div>
              )}
            </div>

            {/* Product Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                Product Solution *
              </label>
              <select
                className="input"
                value={product}
                onChange={(e) => setProduct(e.target.value as ProductType)}
                required
              >
                {PRODUCTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <div style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {product === 'Higher IQ' && 'AI Recruitment & Candidate Assessment platform'}
                {product === 'HRMS Portal' && 'Core HR, Attendance, Payroll & Workflow platform'}
                {product === 'Both' && 'Integrated Talent Suite & Core HR Infrastructure'}
              </div>
            </div>

            {/* Est. Deal Value */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                Deal Value (USD)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                className="input"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
              />
            </div>

            {/* Stage */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                Pipeline Stage
              </label>
              <select
                className="input"
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadStatus)}
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Requested Priority */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                Target Priority
              </label>
              <select
                className="input"
                value={requestedPriority}
                onChange={(e) => setRequestedPriority(e.target.value as LeadPriority)}
              >
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: QUALIFICATION SIGNALS & FIT FACTORS */}
        <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', backgroundColor: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <h4 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700, margin: 0 }}>
              2. Qualification Signals & Fit Signals
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Configurable scoring engine weights
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {/* Hiring Volume */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                Hiring Volume Signal
              </label>
              <select
                className="input"
                value={hiringVolume}
                onChange={(e) => setHiringVolume(e.target.value as 'High' | 'Medium' | 'Low' | 'None')}
              >
                {HIRING_VOLUMES.map((v) => (
                  <option key={v} value={v}>
                    {v} Volume Hiring
                  </option>
                ))}
              </select>
            </div>

            {/* Company Size */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                Company Headcount Scale
              </label>
              <select
                className="input"
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
              >
                {COMPANY_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Existing Tools */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                Current HR / Assessment Tools
              </label>
              <input
                type="text"
                className="input"
                value={existingTools}
                onChange={(e) => setExistingTools(e.target.value)}
                placeholder="e.g., Spreadsheets, Legacy Workday, No assessment tooling"
              />
            </div>

            {/* Boolean Toggles */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: '1.25rem', padding: '0.75rem', backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.03))', borderRadius: '8px' }}>
              {/* Hiring Multiple Roles */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input
                  type="checkbox"
                  checked={hiringMultipleRoles}
                  onChange={(e) => setHiringMultipleRoles(e.target.checked)}
                />
                <span><strong>Hiring Multiple Roles Concurrently</strong> (+15 pts)</span>
              </label>

              {/* Manual HR Processes */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input
                  type="checkbox"
                  checked={manualHrProcesses}
                  onChange={(e) => setManualHrProcesses(e.target.checked)}
                />
                <span><strong>Burdened by Manual HR Processes</strong> (+20 pts)</span>
              </label>

              {/* Decision Maker Identified */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input
                  type="checkbox"
                  checked={decisionMakerIdentified}
                  onChange={(e) => setDecisionMakerIdentified(e.target.checked)}
                />
                <span><strong>Decision-Maker Contact Verified</strong> (+15 pts & required for High)</span>
              </label>
            </div>
          </div>
        </div>

        {/* SECTION 3: LIVE BACKEND SCORING & PRIORITY PREVIEW */}
        <div
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '1rem',
            backgroundColor: 'var(--bg-card)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={16} style={{ color: 'var(--primary-color)' }} />
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>
                Live Backend Qualification & Priority Calculation
              </h4>
            </div>
            {previewLoading && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Loader2 size={12} className="spin" /> Calculating...
              </span>
            )}
          </div>

          {preview ? (
            <div>
              {/* Score Meter & Calculated Priority */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '1rem',
                  alignItems: 'center',
                  marginBottom: '1rem',
                  padding: '0.875rem',
                  backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.04))',
                  borderRadius: '8px',
                }}
              >
                {/* Score */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Qualification Score
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '1.75rem', fontWeight: 800, color: preview.score >= 70 ? 'var(--status-success-text, #10b981)' : preview.score >= 40 ? 'var(--status-warning-text, #f59e0b)' : 'var(--text-muted)' }}>
                      {preview.score}
                    </span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>/ 100</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', marginTop: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(preview.score, 100)}%`,
                        backgroundColor: preview.score >= 70 ? '#10b981' : preview.score >= 40 ? '#f59e0b' : '#64748b',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Priority Status */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Backend Computed Priority
                  </div>
                  <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        backgroundColor:
                          preview.calculatedPriority === 'High'
                            ? 'rgba(239, 68, 68, 0.15)'
                            : preview.calculatedPriority === 'Medium'
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'rgba(100, 116, 139, 0.15)',
                        color:
                          preview.calculatedPriority === 'High'
                            ? '#ef4444'
                            : preview.calculatedPriority === 'Medium'
                            ? '#f59e0b'
                            : '#94a3b8',
                        border: `1px solid ${
                          preview.calculatedPriority === 'High'
                            ? 'rgba(239, 68, 68, 0.3)'
                            : preview.calculatedPriority === 'Medium'
                            ? 'rgba(245, 158, 11, 0.3)'
                            : 'rgba(100, 116, 139, 0.3)'
                        }`,
                      }}
                    >
                      {preview.calculatedPriority} Priority
                    </span>
                  </div>
                </div>

                {/* Decision Maker & Fit Signal Status */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Gatekeeper Check
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: preview.hasAppropriateContact ? '#10b981' : '#ef4444' }}>
                      {preview.hasAppropriateContact ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                      {preview.hasAppropriateContact ? 'Decision-Maker Attached' : 'No Decision-Maker'}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      Fit Signals: <strong>{preview.fitSignalsRating}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Validation Warning if High Priority Request downgraded */}
              {requestedPriority === 'High' && !preview.isHighPriorityAllowed && (
                <div
                  style={{
                    padding: '0.625rem 0.875rem',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '6px',
                    fontSize: '0.8125rem',
                    color: 'var(--status-warning-text, #d97706)',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Info size={15} />
                  <span>
                    <strong>High Priority Rule:</strong> {preview.validationReason || 'Requires strong fit signals (score ≥ 70) and a verified decision-maker contact. Lead will be saved as Medium.'}
                  </span>
                </div>
              )}

              {/* Factor Breakdown */}
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                Score Contribution Breakdown:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '6px' }}>
                {preview.scoreBreakdown.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 8px',
                      backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.02))',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                    }}
                  >
                    <span>{item.factor}</span>
                    <span style={{ fontWeight: 700, color: item.points > 0 ? '#10b981' : 'var(--text-muted)' }}>
                      +{item.points} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
              Calculating score based on active qualification signals...
            </div>
          )}
        </div>

        {/* SECTION 4: NOTES */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
              Qualification & Fit Summary Notes
            </label>
            <textarea
              className="input"
              rows={3}
              value={qualificationNotes}
              onChange={(e) => setQualificationNotes(e.target.value)}
              placeholder="Internal reasoning regarding readiness, pain points, and budget authorization..."
              style={{ resize: 'vertical' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
              Sales Notes & Next Steps
            </label>
            <textarea
              className="input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Action items, demo scheduling details, stakeholder discussions..."
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};
