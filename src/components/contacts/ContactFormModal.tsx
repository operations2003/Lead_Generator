import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Contact, CreateContactPayload, ContactStatus, Company } from '../../types';
import { companyService, contactService } from '../../api';
import { AlertCircle, AlertTriangle, Loader2, Star } from 'lucide-react';

export interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateContactPayload) => Promise<void>;
  contactToEdit?: Contact | null;
  initialCompanyId?: string;
}

const TARGET_ROLES = [
  'Recruitment Head',
  'Talent Acquisition Manager',
  'HR Head / VP of People',
  'Chief Executive Officer (CEO)',
  'Founder & Co-Founder',
  'VP of Finance / Payroll Head',
  'Chief Information Security Officer (CISO)',
  'Chief Technology Officer (CTO)',
  'Head of IT Infrastructure',
  'Director of Engineering',
];

const DEPARTMENTS = [
  'Human Resources & Talent',
  'Executive & Leadership',
  'IT & Engineering',
  'Finance & Payroll',
  'Security & Compliance',
  'Operations',
  'Sales & Marketing',
];

const STATUSES: ContactStatus[] = [
  'Active',
  'Contacted',
  'Qualified',
  'Unresponsive',
  'Do Not Contact',
  'Archived',
];

export const ContactFormModal: React.FC<ContactFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  contactToEdit,
  initialCompanyId,
}) => {
  const isEditing = Boolean(contactToEdit);

  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [companyId, setCompanyId] = useState(initialCompanyId || '');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [decisionMaker, setDecisionMaker] = useState(true);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<ContactStatus>('Active');
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  // Companies dropdown list
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Duplicate check state
  const [duplicateWarning, setDuplicateWarning] = useState<{
    name: string;
    companyName: string;
    email: string;
  } | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available companies for the dropdown
  useEffect(() => {
    if (isOpen) {
      setLoadingCompanies(true);
      companyService
        .getCompanies({ limit: 100 })
        .then((res) => {
          if (res.data?.items) {
            setCompanies(res.data.items);
            if (!companyId && res.data.items.length > 0) {
              setCompanyId(initialCompanyId || res.data.items[0].id);
            }
          }
        })
        .catch(() => {
          // Fallback
        })
        .finally(() => setLoadingCompanies(false));
    }
  }, [isOpen, initialCompanyId, companyId]);

  // Sync form when contactToEdit changes
  useEffect(() => {
    if (contactToEdit) {
      setName(contactToEdit.name || '');
      setTitle(contactToEdit.title || '');
      setCompanyId(contactToEdit.companyId || '');
      setEmail(contactToEdit.email || '');
      setPhone(contactToEdit.phone || '');
      setDepartment(contactToEdit.department || DEPARTMENTS[0]);
      setDecisionMaker(contactToEdit.decisionMaker ?? false);
      setLinkedinUrl(contactToEdit.linkedinUrl || '');
      setNotes(contactToEdit.notes || '');
      setStatus(contactToEdit.status || 'Active');
      setAllowDuplicate(false);
      setDuplicateWarning(null);
    } else {
      setName('');
      setTitle(TARGET_ROLES[0]);
      if (initialCompanyId) setCompanyId(initialCompanyId);
      setEmail('');
      setPhone('');
      setDepartment(DEPARTMENTS[0]);
      setDecisionMaker(true);
      setLinkedinUrl('');
      setNotes('');
      setStatus('Active');
      setAllowDuplicate(false);
      setDuplicateWarning(null);
    }
    setError(null);
  }, [contactToEdit, isOpen, initialCompanyId]);

  // Debounced duplicate email check
  useEffect(() => {
    if (!email || !email.includes('@') || email.length < 5) {
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCheckingDuplicate(true);
        const res = await contactService.checkDuplicate(
          email,
          undefined,
          contactToEdit ? contactToEdit.id : undefined
        );
        if (res.data?.isDuplicate && res.data.existingContact) {
          setDuplicateWarning(res.data.existingContact);
        } else {
          setDuplicateWarning(null);
        }
      } catch {
        // Silently catch duplicate check errors
      } finally {
        setCheckingDuplicate(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [email, contactToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Contact name is required.');
      return;
    }
    if (!title.trim()) {
      setError('Job title is required.');
      return;
    }
    if (!companyId) {
      setError('Please select an associated company.');
      return;
    }

    if (duplicateWarning && !allowDuplicate) {
      setError(`Contact email is already used by ${duplicateWarning.name} at ${duplicateWarning.companyName}. Check "Allow duplicate anyway" if you wish to proceed.`);
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        name: name.trim(),
        title: title.trim(),
        companyId,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        department: department.trim() || undefined,
        decisionMaker,
        linkedinUrl: linkedinUrl.trim() || undefined,
        notes: notes.trim() || undefined,
        status,
        allowDuplicate,
      });
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { message?: string; duplicateContact?: { name: string; companyName: string } };
      if (errorObj.duplicateContact) {
        setDuplicateWarning({
          name: errorObj.duplicateContact.name,
          companyName: errorObj.duplicateContact.companyName,
          email,
        });
      }
      setError(errorObj.message || 'Failed to save contact. Please verify the input.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Decision Maker / Contact' : 'Add Decision Maker Contact'}
      maxWidth="680px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            form="contact-form"
            className="btn btn-primary"
            disabled={submitting}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create Contact'}
          </button>
        </div>
      }
    >
      <form id="contact-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              color: '#ef4444',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Duplicate-Warning UX Banner */}
        {duplicateWarning && (
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '6px',
              color: '#d97706',
              fontSize: '13px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <AlertTriangle size={18} />
              <span>Duplicate Contact Warning</span>
            </div>
            <p style={{ margin: '6px 0 8px 26px', fontSize: '12px', color: 'var(--text-secondary, #475569)' }}>
              A contact with email <strong>{duplicateWarning.email}</strong> already exists: <strong>{duplicateWarning.name}</strong> at <strong>{duplicateWarning.companyName}</strong>.
            </p>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginLeft: '26px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '12px',
              }}
            >
              <input
                type="checkbox"
                checked={allowDuplicate}
                onChange={(e) => setAllowDuplicate(e.target.checked)}
              />
              Allow duplicate contact with same email
            </label>
          </div>
        )}

        {/* Name and Job Title */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Full Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Elena Rostova"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Job Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Director of Talent Acquisition"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)' }}
            />
          </div>
        </div>

        {/* Target Role Quick Select Pills */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary, #64748b)', marginBottom: '4px' }}>
            Quick-select target buyer persona:
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {TARGET_ROLES.slice(0, 6).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setTitle(role)}
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  border: title === role ? '1px solid var(--primary-500, #3b82f6)' : '1px solid var(--border-color, #e2e8f0)',
                  backgroundColor: title === role ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary, #f8fafc)',
                  color: title === role ? 'var(--primary-600, #2563eb)' : 'var(--text-secondary, #64748b)',
                  cursor: 'pointer',
                  fontWeight: title === role ? 600 : 400,
                }}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Associated Company & Department */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Associated Company <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              className="form-control"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              disabled={loadingCompanies}
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)' }}
            >
              <option value="" disabled>Select Target Company...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.industry})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Department
            </label>
            <select
              className="form-control"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)' }}
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Email & Phone */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                Email Address
              </label>
              {checkingDuplicate && (
                <span style={{ fontSize: '11px', color: 'var(--text-secondary, #64748b)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Loader2 size={11} className="animate-spin" /> Checking...
                </span>
              )}
            </div>
            <input
              type="email"
              className="form-control"
              placeholder="e.g. elena@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Phone Number
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. +1 (415) 555-0142"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)' }}
            />
          </div>
        </div>

        {/* LinkedIn Profile & Status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              LinkedIn Profile URL
            </label>
            <input
              type="url"
              className="form-control"
              placeholder="https://linkedin.com/in/username"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Contact Status
            </label>
            <select
              className="form-control"
              value={status}
              onChange={(e) => setStatus(e.target.value as ContactStatus)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)' }}
            >
              {STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Decision Maker Switch */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            backgroundColor: decisionMaker ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-secondary, #f8fafc)',
            border: decisionMaker ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Star
              size={18}
              fill={decisionMaker ? '#f59e0b' : 'none'}
              color={decisionMaker ? '#f59e0b' : 'var(--text-secondary, #64748b)'}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px' }}>Mark as Target Decision Maker</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary, #64748b)' }}>
                Target contacts hold purchasing, budget, or evaluation authority for IT solutions.
              </div>
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={decisionMaker}
              onChange={(e) => setDecisionMaker(e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
          </label>
        </div>

        {/* Notes */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
            Notes & Context
          </label>
          <textarea
            className="form-control"
            rows={3}
            placeholder="e.g. Met at Cloud Summit; evaluating applicant tracking & sourcing tool stack for Q4."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)' }}
          />
        </div>
      </form>
    </Modal>
  );
};
