import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { WeeklyTargetSummary, WeeklyTargetType } from '../../types';
import { targetService } from '../../api';
import { Loader2, AlertCircle, Save } from 'lucide-react';

export interface ConfigureTargetsModalProps {
  isOpen: boolean;
  targets: WeeklyTargetSummary[];
  onClose: () => void;
  onSuccess: () => void;
}

export const ConfigureTargetsModal: React.FC<ConfigureTargetsModalProps> = ({
  isOpen,
  targets,
  onClose,
  onSuccess,
}) => {
  const [companies, setCompanies] = useState<number>(25);
  const [contacts, setContacts] = useState<number>(50);
  const [outreach, setOutreach] = useState<number>(75);
  const [replies, setReplies] = useState<number>(20);
  const [demos, setDemos] = useState<number>(8);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (targets && targets.length > 0) {
      for (const t of targets) {
        if (t.target_type === 'companies') setCompanies(t.target_value);
        if (t.target_type === 'contacts') setContacts(t.target_value);
        if (t.target_type === 'outreach') setOutreach(t.target_value);
        if (t.target_type === 'replies') setReplies(t.target_value);
        if (t.target_type === 'demos') setDemos(t.target_value);
      }
    }
  }, [targets, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const targetList: Array<{ type: WeeklyTargetType; value: number }> = [
      { type: 'companies', value: Number(companies) },
      { type: 'contacts', value: Number(contacts) },
      { type: 'outreach', value: Number(outreach) },
      { type: 'replies', value: Number(replies) },
      { type: 'demos', value: Number(demos) },
    ];

    try {
      await Promise.all(
        targetList.map((t) =>
          targetService.saveWeeklyTarget({
            targetType: t.type,
            targetValue: t.value,
          })
        )
      );

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to update weekly targets');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Team Weekly Targets"
      maxWidth="540px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Set benchmark quotas for the current work week. Actual performance will be tracked in real-time from active database records.
        </p>

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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
              Target: New Companies Added
            </label>
            <input
              type="number"
              min="0"
              className="form-control"
              value={companies}
              onChange={(e) => setCompanies(Number(e.target.value))}
              required
            />
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
              Target: Contacts Found
            </label>
            <input
              type="number"
              min="0"
              className="form-control"
              value={contacts}
              onChange={(e) => setContacts(Number(e.target.value))}
              required
            />
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
              Target: Messages & Calls (Outreach Touches)
            </label>
            <input
              type="number"
              min="0"
              className="form-control"
              value={outreach}
              onChange={(e) => setOutreach(Number(e.target.value))}
              required
            />
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
              Target: Prospect Replies
            </label>
            <input
              type="number"
              min="0"
              className="form-control"
              value={replies}
              onChange={(e) => setReplies(Number(e.target.value))}
              required
            />
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
              Target: Demos Booked
            </label>
            <input
              type="number"
              min="0"
              className="form-control"
              value={demos}
              onChange={(e) => setDemos(Number(e.target.value))}
              required
            />
          </div>
        </div>

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
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Save Targets</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
