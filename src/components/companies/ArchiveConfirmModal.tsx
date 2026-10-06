import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Company } from '../../types';
import { AlertTriangle, Loader2 } from 'lucide-react';

export interface ArchiveConfirmModalProps {
  isOpen: boolean;
  company: Company | null;
  onClose: () => void;
  onConfirm: (company: Company) => Promise<void>;
}

export const ArchiveConfirmModal: React.FC<ArchiveConfirmModalProps> = ({
  isOpen,
  company,
  onClose,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!company) return null;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm(company);
      onClose();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || 'Failed to archive company.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Archive Target Company"
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
          >
            {loading ? (
              <>
                <Loader2 size={16} className="spin" style={{ marginRight: '6px' }} />
                Archiving...
              </>
            ) : (
              'Confirm Archive'
            )}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <div
          style={{
            padding: '10px',
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            borderRadius: '50%',
            flexShrink: 0,
          }}
        >
          <AlertTriangle size={24} />
        </div>
        <div>
          <p style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
            Are you sure you want to archive {company.name}?
          </p>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #64748b)', lineHeight: 1.5 }}>
            Archiving will remove this company from active lead searches and pipelines.
            Existing historical leads and contacts will be preserved, and the company can be retrieved at any time by filtering for archived records.
          </p>

          {error && (
            <div
              style={{
                marginTop: '12px',
                padding: '8px 12px',
                backgroundColor: '#fef2f2',
                color: '#b91c1c',
                borderRadius: '6px',
                fontSize: '13px',
              }}
            >
              {error}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
