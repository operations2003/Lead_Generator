import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Lead, LeadStatus } from '../../types';
import { AlertCircle, ArrowRight, Loader2, Sparkles } from 'lucide-react';

export interface StageChangeModalProps {
  isOpen: boolean;
  lead: Lead | null;
  targetStage: LeadStatus | null;
  onClose: () => void;
  onConfirm: (leadId: string, targetStage: LeadStatus, lostReason?: string, notes?: string) => Promise<void>;
}

const VALID_LOST_REASONS = [
  'Budget Constraints / No Funds',
  'Competitor Chosen',
  'No Response / Ghosted',
  'Timing Not Right / Deferred',
  'Product Feature Gap / Unmet Requirements',
  'No Authority / Decision-Maker Blocked',
  'Internal Solution Built',
  'Company Reorganizing / Hiring Freeze',
  'Other',
];

export const StageChangeModal: React.FC<StageChangeModalProps> = ({
  isOpen,
  lead,
  targetStage,
  onClose,
  onConfirm,
}) => {
  const [lostReason, setLostReason] = useState(VALID_LOST_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!lead || !targetStage) return null;

  const isTransitionToLost = targetStage === 'Lost';
  const isTransitionToWon = targetStage === 'Won';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let finalLostReason: string | undefined = undefined;
    if (isTransitionToLost) {
      if (lostReason === 'Other') {
        if (!customReason.trim()) {
          setError('Please provide details for the lost reason');
          return;
        }
        finalLostReason = customReason.trim();
      } else {
        finalLostReason = lostReason;
      }
    }

    setSubmitting(true);
    try {
      await onConfirm(lead.id, targetStage, finalLostReason, notes.trim() || undefined);
      onClose();
    } catch (err: unknown) {
      const errObj = err as { error?: { message?: string }; message?: string };
      const msg = errObj?.error?.message || errObj?.message || 'Failed to update pipeline stage';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getStageBadgeColor = (stage: LeadStatus) => {
    switch (stage) {
      case 'New':
        return '#3b82f6';
      case 'Contacted':
        return '#0ea5e9';
      case 'Replied':
        return '#8b5cf6';
      case 'Demo Booked':
        return '#f59e0b';
      case 'Demo Done':
        return '#ec4899';
      case 'Won':
        return '#10b981';
      case 'Lost':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isTransitionToLost
          ? 'Mark Opportunity as Lost'
          : isTransitionToWon
          ? '🎉 Mark Opportunity as Won!'
          : 'Advance Pipeline Stage'
      }
      maxWidth="540px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
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
            form="stage-change-form"
            className={isTransitionToLost ? 'btn btn-danger' : 'btn btn-primary'}
            disabled={submitting}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>Updating Stage...</span>
              </>
            ) : (
              <span>Confirm & Transition to {targetStage}</span>
            )}
          </button>
        </div>
      }
    >
      <form id="stage-change-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Stage Transition Visual */}
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.03))',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Current Stage
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: getStageBadgeColor(lead.status), marginTop: '2px' }}>
              {lead.status}
            </div>
          </div>

          <ArrowRight size={20} style={{ color: 'var(--text-muted)' }} />

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Target Stage
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: getStageBadgeColor(targetStage), marginTop: '2px' }}>
              {targetStage}
            </div>
          </div>
        </div>

        {/* Lead Context Summary */}
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Lead: <strong>{lead.title}</strong> for <strong>{lead.companyName}</strong> ({lead.product} — ${(lead.value || 0).toLocaleString()} USD)
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.875rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Lost Reason Form (Mandatory for Lost Stage) */}
        {isTransitionToLost && (
          <div style={{ border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '6px', color: '#ef4444' }}>
              Lost Reason (Required by Sales Audit) *
            </label>
            <select
              className="input"
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              required
            >
              {VALID_LOST_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            {lostReason === 'Other' && (
              <div style={{ marginTop: '0.5rem' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Specify custom lost reason..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  required
                />
              </div>
            )}
          </div>
        )}

        {/* Won Celebration Notice */}
        {isTransitionToWon && (
          <div style={{ border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#10b981', fontSize: '0.9rem' }}>
              <Sparkles size={18} />
              <span>Closing Deal & Revenue Recognition</span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              This will record a Won timestamp, update pipeline dashboards, and log the conversion in audit history.
            </div>
          </div>
        )}

        {/* Notes on Transition */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
            Transition Activity Notes (Recorded in Stage History)
          </label>
          <textarea
            className="input"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add context for this stage move (e.g., demo feedback, stakeholder next steps, pricing discount)..."
            style={{ resize: 'vertical' }}
          />
        </div>
      </form>
    </Modal>
  );
};
