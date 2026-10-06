import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Contact } from '../../types';
import { AlertTriangle, Loader2 } from 'lucide-react';

export interface ArchiveContactModalProps {
  isOpen: boolean;
  contact: Contact | null;
  onClose: () => void;
  onConfirm: (contact: Contact, permanent?: boolean) => Promise<void>;
}

export const ArchiveContactModal: React.FC<ArchiveContactModalProps> = ({
  isOpen,
  contact,
  onClose,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permanent, setPermanent] = useState(false);

  if (!contact) return null;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm(contact, permanent);
      onClose();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || 'Failed to archive contact.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={permanent ? 'Permanently Delete Contact' : 'Archive Contact'}
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
            {loading && <Loader2 size={16} className="animate-spin" />}
            {permanent ? 'Permanently Delete' : 'Archive Contact'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <div
          style={{
            padding: '10px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '50%',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <AlertTriangle size={24} />
        </div>
        <div>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 600 }}>
            {permanent ? 'Delete' : 'Archive'} "{contact.name}"?
          </h4>
          <p style={{ margin: 0, color: 'var(--text-secondary, #64748b)', fontSize: '13px', lineHeight: 1.5 }}>
            {permanent
              ? 'This will completely remove the contact and detach any linked pipeline records. This action cannot be undone.'
              : `This will mark ${contact.name} (${contact.title} at ${contact.companyName}) as archived. They will be hidden from the active decision makers list.`}
          </p>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '14px',
              fontSize: '12px',
              cursor: 'pointer',
              color: 'var(--text-secondary, #64748b)',
            }}
          >
            <input
              type="checkbox"
              checked={permanent}
              onChange={(e) => setPermanent(e.target.checked)}
            />
            Permanently delete instead of archiving
          </label>

          {error && (
            <div style={{ marginTop: '12px', color: '#ef4444', fontSize: '12px' }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
