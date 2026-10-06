import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { FollowUp } from '../../types';
import { followUpService } from '../../api';
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export interface RescheduleFollowUpModalProps {
  isOpen: boolean;
  followUp: FollowUp | null;
  onClose: () => void;
  onSuccess?: (updated: FollowUp) => void;
}

export const RescheduleFollowUpModal: React.FC<RescheduleFollowUpModalProps> = ({
  isOpen,
  followUp,
  onClose,
  onSuccess,
}) => {
  const [newDueDate, setNewDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [rescheduleNotes, setRescheduleNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!followUp) return null;

  const handleAddDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setNewDueDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDueDate) {
      setError('Please select a new due date');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await followUpService.rescheduleFollowUp(
        followUp.id,
        newDueDate,
        rescheduleNotes.trim() || undefined
      );

      if (res.data) {
        onSuccess?.(res.data);
        onClose();
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string; error?: { message?: string } };
      setError(errObj?.error?.message || errObj?.message || 'Failed to reschedule follow-up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reschedule Follow-Up Task"
      maxWidth="520px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="submit"
            form="reschedule-followup-form"
            className="btn btn-primary"
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {loading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
            <span>{loading ? 'Rescheduling...' : 'Confirm Reschedule'}</span>
          </button>
        </div>
      }
    >
      <form id="reschedule-followup-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Info card */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-subtle, rgba(255, 255, 255, 0.04))',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
            {followUp.title}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <span>Account: <strong>{followUp.company_name}</strong></span>
            {followUp.contact_name && <span>Contact: <strong>{followUp.contact_name}</strong></span>}
            <span>Current Due: <strong>{followUp.due_date.split('T')[0]}</strong></span>
          </div>
          {followUp.rescheduled_count > 0 && (
            <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertTriangle size={12} />
              <span>Previously rescheduled {followUp.rescheduled_count} time(s)</span>
            </div>
          )}
        </div>

        {error && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '0.8125rem',
            }}
          >
            {error}
          </div>
        )}

        {/* Date Selection */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
              New Follow-Up Date <span style={{ color: '#ef4444' }}>*</span>
            </label>
            {/* Quick shortcuts */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                onClick={() => handleAddDays(1)}
              >
                Tomorrow (+1d)
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                onClick={() => handleAddDays(3)}
              >
                In 3 Days
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                onClick={() => handleAddDays(7)}
              >
                Next Week (+7d)
              </button>
            </div>
          </div>
          <input
            type="date"
            className="input"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            required
            style={{ width: '100%' }}
          />
        </div>

        {/* Reschedule Reason */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
            Reason for Rescheduling / Context
          </label>
          <textarea
            className="input"
            rows={3}
            value={rescheduleNotes}
            onChange={(e) => setRescheduleNotes(e.target.value)}
            placeholder="e.g. Prospect is traveling until next Tuesday, requested follow-up next week..."
            style={{ resize: 'vertical' }}
          />
        </div>
      </form>
    </Modal>
  );
};
