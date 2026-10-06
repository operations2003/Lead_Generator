import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Contact } from '../../types';
import {
  Building2,
  Mail,
  Phone,
  Linkedin,
  Star,
  Target,
  Edit2,
  Trash2,
  ExternalLink,
  Calendar,
  FileText,
  Save,
  CheckCircle,
  Loader2,
  Layers,
} from 'lucide-react';

export interface ContactDetailModalProps {
  isOpen: boolean;
  contact: Contact | null;
  onClose: () => void;
  onEdit?: (contact: Contact) => void;
  onDelete?: (contact: Contact) => void;
  onToggleDecisionMaker?: (contact: Contact) => Promise<void>;
  onUpdateNotes?: (contactId: string, notes: string) => Promise<void>;
  onNavigateToCompany?: (companyId: string) => void;
}

export const ContactDetailModal: React.FC<ContactDetailModalProps> = ({
  isOpen,
  contact,
  onClose,
  onEdit,
  onDelete,
  onToggleDecisionMaker,
  onUpdateNotes,
  onNavigateToCompany,
}) => {
  if (!contact) return null;

  const [notesText, setNotesText] = useState(contact.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedSuccess, setNotesSavedSuccess] = useState(false);

  const handleSaveNotes = async () => {
    if (!onUpdateNotes) return;
    try {
      setIsSavingNotes(true);
      await onUpdateNotes(contact.id, notesText);
      setNotesSavedSuccess(true);
      setTimeout(() => setNotesSavedSuccess(false), 2000);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <span className="badge badge-success">Active</span>;
      case 'Qualified':
        return <span className="badge badge-primary">Qualified</span>;
      case 'Contacted':
        return <span className="badge badge-info">Contacted</span>;
      case 'Unresponsive':
        return <span className="badge badge-warning">Unresponsive</span>;
      case 'Archived':
        return <span className="badge badge-danger">Archived</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Decision Maker & Contact Details"
      maxWidth="780px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div>
            {onDelete && contact.status !== 'Archived' && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  onClose();
                  onDelete(contact);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={15} /> Archive Contact
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {onToggleDecisionMaker && (
              <button
                type="button"
                className={`btn ${contact.decisionMaker ? 'btn-secondary' : 'btn-primary'}`}
                onClick={() => onToggleDecisionMaker(contact)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Star size={15} fill={contact.decisionMaker ? 'none' : 'currentColor'} />
                {contact.decisionMaker ? 'Unmark Decision Maker' : 'Mark as Decision Maker'}
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onClose();
                  onEdit(contact);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Edit2 size={15} /> Edit Contact
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header Hero */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: contact.decisionMaker
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                  : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 700,
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
              }}
            >
              {contact.name[0]?.toUpperCase() || 'C'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{contact.name}</h3>
                {contact.decisionMaker && (
                  <span
                    className="badge"
                    style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#b45309',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    <Star size={12} fill="#b45309" /> Decision Maker
                  </span>
                )}
                {getStatusBadge(contact.status)}
              </div>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary, #64748b)', fontSize: '14px' }}>
                <strong>{contact.title}</strong> • {contact.department || 'General'}
              </p>
            </div>
          </div>
        </div>

        {/* Company → Contacts → Lead Relationship Map Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            backgroundColor: 'rgba(59, 130, 246, 0.05)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '8px',
            fontSize: '13px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--primary-600, #2563eb)' }}>
            <Layers size={16} /> CRM Hierarchy:
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary, #475569)' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>{contact.companyName}</span>
            <span>➔</span>
            <span style={{ fontWeight: 600, color: 'var(--primary-600, #2563eb)' }}>{contact.name} ({contact.title})</span>
            <span>➔</span>
            <span style={{ fontWeight: 600, color: '#16a34a' }}>{contact.leads?.length || 0} Pipeline Lead(s)</span>
          </div>
        </div>

        {/* 2-Column Grid: Contact Information & Associated Company */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Contact Direct Channels */}
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--bg-secondary, #f8fafc)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '8px',
            }}
          >
            <h4 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary, #64748b)' }}>
              Direct Channels
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={16} color="var(--primary-500, #3b82f6)" />
                {contact.email ? (
                  <a
                    href={`mailto:${contact.email}`}
                    style={{ color: 'var(--primary-600, #2563eb)', textDecoration: 'none', fontWeight: 500 }}
                  >
                    {contact.email}
                  </a>
                ) : (
                  <span style={{ color: 'var(--text-secondary, #94a3b8)' }}>No email on file</span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={16} color="#10b981" />
                {contact.phone ? (
                  <a href={`tel:${contact.phone}`} style={{ color: 'var(--text-primary, #0f172a)', textDecoration: 'none' }}>
                    {contact.phone}
                  </a>
                ) : (
                  <span style={{ color: 'var(--text-secondary, #94a3b8)' }}>No direct phone</span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Linkedin size={16} color="#0a66c2" />
                {contact.linkedinUrl ? (
                  <a
                    href={contact.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#0a66c2',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 500,
                    }}
                  >
                    View LinkedIn Profile <ExternalLink size={12} />
                  </a>
                ) : (
                  <span style={{ color: 'var(--text-secondary, #94a3b8)' }}>No LinkedIn provided</span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary, #64748b)', fontSize: '12px' }}>
                <Calendar size={15} /> Added {new Date(contact.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Associated Company Card */}
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--bg-secondary, #f8fafc)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary, #64748b)' }}>
                Target Organization
              </h4>
              {onNavigateToCompany && (
                <button
                  type="button"
                  onClick={() => onNavigateToCompany(contact.companyId)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-600, #2563eb)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0,
                  }}
                >
                  View Company <ExternalLink size={12} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary-600, #2563eb)',
                }}
              >
                <Building2 size={20} />
              </div>
              <div style={{ fontSize: '13px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{contact.companyName}</div>
                {contact.companyIndustry && (
                  <div style={{ color: 'var(--text-secondary, #64748b)', fontSize: '12px' }}>
                    {contact.companyIndustry} {contact.companyLocation ? `• ${contact.companyLocation}` : ''}
                  </div>
                )}
                {contact.companyWebsite && (
                  <div style={{ marginTop: '4px' }}>
                    <a
                      href={contact.companyWebsite.startsWith('http') ? contact.companyWebsite : `https://${contact.companyWebsite}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--primary-600, #2563eb)', fontSize: '12px', textDecoration: 'none' }}
                    >
                      {contact.companyDomain || contact.companyWebsite}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Notes & Strategic Context with inline updater */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} /> Buyer Notes & Authority Context
            </label>
            {onUpdateNotes && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {notesSavedSuccess && (
                  <span style={{ fontSize: '12px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={14} /> Notes saved
                  </span>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={isSavingNotes || notesText === contact.notes}
                  onClick={handleSaveNotes}
                  style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {isSavingNotes ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Save Notes
                </button>
              </div>
            )}
          </div>
          <textarea
            className="form-control"
            rows={3}
            placeholder="Add background notes, key objections, budget status, or personal rapport notes..."
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #cbd5e1)',
              fontSize: '13px',
            }}
          />
        </div>

        {/* Associated Leads / Deals */}
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '10px 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Target size={16} /> Associated Pipeline Deals ({contact.leads?.length || 0})
          </h4>
          {contact.leads && contact.leads.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {contact.leads.map((lead) => (
                <div
                  key={lead.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    backgroundColor: 'var(--bg-secondary, #f8fafc)',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '6px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{lead.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                      Status: <strong>{lead.status}</strong> • Priority: <strong>{lead.priority}</strong>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: '#16a34a' }}>
                      ${lead.value.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary, #64748b)' }}>
                      {new Date(lead.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: '16px',
                textAlign: 'center',
                color: 'var(--text-secondary, #64748b)',
                fontSize: '13px',
                backgroundColor: 'var(--bg-secondary, #f8fafc)',
                borderRadius: '6px',
              }}
            >
              No active pipeline deals mapped to this contact yet.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
