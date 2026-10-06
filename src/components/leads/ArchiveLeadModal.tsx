import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Lead } from '../../types';
import { AlertTriangle, Loader2 } from 'lucide-react';

export interface ArchiveLeadModalProps {
  isOpen: boolean;
  lead: Lead | null;
  onClose: () => void;
  onConfirm: (lead: Lead, permanent?: boolean) => Promise<void>;
}

export const ArchiveLeadModal: React.FC<ArchiveLeadModalProps> = ({
  isOpen,
  lead,
  onClose,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permanent, setPermanent] = useState(false);

  if (!lead) return null;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm(lead, permanent);
      onClose();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || 'Failed to archive lead.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={permanent ? 'Permanently Delete Lead' : 'Archive Qualified Lead'}
      maxWidth="500px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleConfirm}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{permanent ? 'Permanently Delete' : 'Archive Lead'}</span>
            )}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div
            style={{
              padding: '8px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
            }}
          >
            <AlertTriangle size={24} />
          </div>
          <div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 600 }}>
              Are you sure you want to {permanent ? 'delete' : 'archive'} this lead?
            </h4>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              <strong>{lead.title}</strong> for <strong>{lead.companyName}</strong> ({lead.product}).
            </p>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '6px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              fontSize: '0.85rem',
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            padding: '0.75rem',
            backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.03))',
            borderRadius: '6px',
            fontSize: '0.8125rem',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={permanent}
              onChange={(e) => setPermanent(e.target.checked)}
            />
            <span>Permanently delete record from database instead of soft archiving</span>
          </label>
        </div>
      </div>
    </Modal>
  );
};
