import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { leadCaptureService } from '../../api';
import { Lead } from '../../types';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';

export interface AtsScoreCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (lead: Lead, isExistingContact: boolean) => void;
}

export const AtsScoreCaptureModal: React.FC<AtsScoreCaptureModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('Talent Acquisition Manager');
  const [atsScore, setAtsScore] = useState<number>(85);
  const [resumeName, setResumeName] = useState('Senior_Software_Engineer_Resume.pdf');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Valid email address is required');
      return;
    }
    if (!companyName.trim()) {
      setError('Company name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await leadCaptureService.captureAtsScoreLead({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        companyName: companyName.trim(),
        jobTitle: jobTitle.trim() || null,
        atsScore: Number(atsScore),
        resumeName: resumeName.trim() || null,
        notes: notes.trim() || null,
      });

      if (res.data) {
        onSuccess(res.data.lead, res.data.isExistingContact);
        onClose();
      }
    } catch (err: unknown) {
      const e = err as { message?: string; response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || e.message || 'Failed to capture ATS score lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Inbound Free ATS Score Check Lead Capture"
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div
          style={{
            padding: '0.85rem 1rem',
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
          }}
        >
          <Sparkles size={20} color="var(--primary-400)" style={{ flexShrink: 0 }} />
          <span>
            Captures inbound prospects from the Free ATS Resume Checker tool. Existing contacts with matching emails will be safely re-engaged without creating duplicate records.
          </span>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--status-error)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--status-error)',
              fontSize: '0.875rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Name and Email */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              Candidate / Contact Name <span style={{ color: 'var(--status-error)' }}>*</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Vikram Malhotra"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              Work Email <span style={{ color: 'var(--status-error)' }}>*</span>
            </label>
            <input
              type="email"
              className="form-control"
              placeholder="e.g. vikram@techcompany.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Company & Job Title */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              Company Name <span style={{ color: 'var(--status-error)' }}>*</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. CloudScale Innovations"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              Job Title / Role
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Talent Acquisition Manager"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>
        </div>

        {/* Phone & Resume File */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              Phone Number
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. +91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              Resume Filename
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Resume_2026.pdf"
              value={resumeName}
              onChange={(e) => setResumeName(e.target.value)}
            />
          </div>
        </div>

        {/* ATS Score Slider */}
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>
              Calculated Free ATS Score
            </label>
            <span
              style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: atsScore >= 80 ? 'var(--status-success)' : atsScore >= 60 ? '#f59e0b' : 'var(--status-error)',
              }}
            >
              {atsScore} / 100
            </span>
          </div>

          <input
            type="range"
            min="10"
            max="100"
            value={atsScore}
            onChange={(e) => setAtsScore(Number(e.target.value))}
            style={{ width: '100%', cursor: 'pointer' }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            <span>Weak Fit (&lt;60%)</span>
            <span>Moderate Fit (60-79%)</span>
            <span>Strong Fit (&ge;80% High Priority)</span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
            Candidate / Screening Notes
          </label>
          <textarea
            className="form-control"
            rows={2}
            placeholder="Key skills identified, candidate remarks, or requisitions being hired for..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            marginTop: '0.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            <span>Capture & Enroll Lead</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
