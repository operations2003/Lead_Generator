import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Lead } from '../../types';
import {
  Building2,
  Mail,
  Phone,
  Star,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Save,
  Loader2,
  Users,
} from 'lucide-react';

export interface LeadDetailModalProps {
  isOpen: boolean;
  lead: Lead | null;
  onClose: () => void;
  onEdit?: (lead: Lead) => void;
  onDelete?: (lead: Lead) => void;
  onUpdateNotes?: (leadId: string, notes: string) => Promise<void>;
  onRequestStageChange?: (lead: Lead, targetStage: Lead['status']) => void;
  onNavigateToCompany?: (companyId: string) => void;
  onNavigateToContact?: (contactId: string) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  isOpen,
  lead,
  onClose,
  onEdit,
  onDelete,
  onUpdateNotes,
  onRequestStageChange,
  onNavigateToCompany,
  onNavigateToContact,
}) => {
  if (!lead) return null;

  const [notesText, setNotesText] = useState(lead.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedSuccess, setNotesSavedSuccess] = useState(false);

  const handleSaveNotes = async () => {
    if (!onUpdateNotes) return;
    try {
      setIsSavingNotes(true);
      await onUpdateNotes(lead.id, notesText);
      setNotesSavedSuccess(true);
      setTimeout(() => setNotesSavedSuccess(false), 2000);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'High':
        return (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: 800,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <TrendingUp size={14} /> High Priority
          </span>
        );
      case 'Medium':
        return (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: 700,
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Medium Priority
          </span>
        );
      default:
        return (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              backgroundColor: 'rgba(100, 116, 139, 0.15)',
              color: '#94a3b8',
              border: '1px solid rgba(100, 116, 139, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Low Priority
          </span>
        );
    }
  };

  const getProductBadge = (product: string) => {
    let bg = 'rgba(59, 130, 246, 0.15)';
    let color = '#3b82f6';
    let border = 'rgba(59, 130, 246, 0.3)';

    if (product === 'HRMS Portal') {
      bg = 'rgba(139, 92, 246, 0.15)';
      color = '#8b5cf6';
      border = 'rgba(139, 92, 246, 0.3)';
    } else if (product === 'Both') {
      bg = 'rgba(16, 185, 129, 0.15)';
      color = '#10b981';
      border = 'rgba(16, 185, 129, 0.3)';
    }

    return (
      <span
        style={{
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 700,
          backgroundColor: bg,
          color,
          border: `1px solid ${border}`,
        }}
      >
        {product}
      </span>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Qualified Lead & Pipeline Opportunity"
      maxWidth="840px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div>
            {onDelete && lead.status !== 'Archived' && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  onDelete(lead);
                  onClose();
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={16} />
                <span>Archive Lead</span>
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            {onEdit && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onEdit(lead);
                  onClose();
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Edit2 size={16} />
                <span>Edit Lead</span>
              </button>
            )}
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* HEADER SECTION: Title, Product, Priority, Stage */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              {getProductBadge(lead.product)}
              {getPriorityBadge(lead.priority)}
              <span
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.05))',
                  border: '1px solid var(--border-color)',
                }}
              >
                Stage: {lead.status}
              </span>
              {lead.lostReason && (
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                >
                  Lost: {lead.lostReason}
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '6px 0 2px 0', color: 'var(--text-primary)' }}>
              {lead.title}
            </h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>
                Account: <strong>{lead.companyName}</strong>
              </span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: 'var(--status-success-text, #10b981)', fontWeight: 700 }}>
                <DollarSign size={14} />
                ${(lead.value || 0).toLocaleString()} USD
              </span>
            </div>

            {/* Stage Change Action Bar */}
            {onRequestStageChange && (
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Move Stage:</span>
                {lead.status === 'New' && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                    onClick={() => {
                      onRequestStageChange(lead, 'Contacted');
                      onClose();
                    }}
                  >
                    Contacted →
                  </button>
                )}
                {lead.status === 'Contacted' && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                    onClick={() => {
                      onRequestStageChange(lead, 'Replied');
                      onClose();
                    }}
                  >
                    Replied →
                  </button>
                )}
                {lead.status === 'Replied' && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                    onClick={() => {
                      onRequestStageChange(lead, 'Demo Booked');
                      onClose();
                    }}
                  >
                    Book Demo →
                  </button>
                )}
                {lead.status === 'Demo Booked' && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                    onClick={() => {
                      onRequestStageChange(lead, 'Demo Done');
                      onClose();
                    }}
                  >
                    Demo Done →
                  </button>
                )}
                {lead.status === 'Demo Done' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                    onClick={() => {
                      onRequestStageChange(lead, 'Won');
                      onClose();
                    }}
                  >
                    🎉 Mark Won
                  </button>
                )}
                {lead.status !== 'Lost' && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                    onClick={() => {
                      onRequestStageChange(lead, 'Lost');
                      onClose();
                    }}
                  >
                    Mark Lost
                  </button>
                )}
                {lead.status === 'Lost' && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                    onClick={() => {
                      onRequestStageChange(lead, 'Contacted');
                      onClose();
                    }}
                  >
                    Re-engage Lead →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Qualification Score Dial */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              padding: '0.75rem 1.25rem',
              borderRadius: '10px',
              minWidth: '130px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Lead Score
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', margin: '2px 0' }}>
              <span
                style={{
                  fontSize: '1.85rem',
                  fontWeight: 900,
                  color:
                    lead.qualificationScore >= 70
                      ? '#10b981'
                      : lead.qualificationScore >= 40
                      ? '#f59e0b'
                      : '#94a3b8',
                }}
              >
                {lead.qualificationScore}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/100</span>
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: lead.qualificationScore >= 70 ? '#10b981' : lead.qualificationScore >= 40 ? '#f59e0b' : '#94a3b8' }}>
              {lead.qualificationScore >= 70 ? 'Strong Fit' : lead.qualificationScore >= 40 ? 'Moderate Fit' : 'Weak Fit'}
            </div>
          </div>
        </div>

        {/* SECTION: COMPANY & CONTACT RELATIONSHIP CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {/* Company Card */}
          <div
            style={{
              padding: '1rem',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                <Building2 size={15} /> Company Relationship
              </div>
              {onNavigateToCompany && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                  onClick={() => onNavigateToCompany(lead.companyId)}
                >
                  View Company
                </button>
              )}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>
              {lead.companyName}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {lead.companyIndustry && <div>Industry: {lead.companyIndustry}</div>}
              {lead.companyLocation && <div>Location: {lead.companyLocation}</div>}
              {lead.companyProductFit && (
                <div>
                  Product Fit Target: <span className="badge badge-neutral">{lead.companyProductFit}</span>
                </div>
              )}
            </div>
          </div>

          {/* Contact Card */}
          <div
            style={{
              padding: '1rem',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                <Users size={15} /> Primary Contact
              </div>
              {lead.contactId && onNavigateToContact && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                  onClick={() => onNavigateToContact(lead.contactId!)}
                >
                  View Contact
                </button>
              )}
            </div>

            {lead.contactName ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 700 }}>{lead.contactName}</span>
                  {lead.contactDecisionMaker && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        backgroundColor: 'rgba(245, 158, 11, 0.15)',
                        color: '#f59e0b',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                      }}
                    >
                      <Star size={10} fill="#f59e0b" /> Decision Maker
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>{lead.contactTitle || 'Title not specified'}</div>
                  {lead.contactEmail && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Mail size={12} /> {lead.contactEmail}
                    </div>
                  )}
                  {lead.contactPhone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={12} /> {lead.contactPhone}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444' }}>
                  <AlertTriangle size={14} /> No contact attached to this lead yet.
                </span>
                <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                  Leads without verified decision-maker contacts cannot be High Priority.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION: QUALIFICATION SIGNALS & INDICATORS */}
        <div
          style={{
            padding: '1rem',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Qualification Signals Evaluated
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {/* Hiring Volume */}
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.03))', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hiring Volume</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginTop: '2px' }}>
                {lead.hiringVolume || 'None'} Volume
              </div>
            </div>

            {/* Hiring Multiple Roles */}
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.03))', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hiring Multiple Roles</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', color: lead.hiringMultipleRoles ? '#10b981' : 'var(--text-muted)' }}>
                {lead.hiringMultipleRoles ? <CheckCircle2 size={14} /> : 'No'}
                {lead.hiringMultipleRoles ? 'Yes (Active Multiple)' : ''}
              </div>
            </div>

            {/* Manual HR Processes */}
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.03))', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Manual HR Processes</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', color: lead.manualHrProcesses ? '#10b981' : 'var(--text-muted)' }}>
                {lead.manualHrProcesses ? <CheckCircle2 size={14} /> : 'No'}
                {lead.manualHrProcesses ? 'Yes (Spreadsheet / Manual)' : ''}
              </div>
            </div>

            {/* Decision Maker Verified */}
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.03))', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Decision Maker Identified</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', color: (lead.decisionMakerIdentified || lead.contactDecisionMaker) ? '#10b981' : '#ef4444' }}>
                {(lead.decisionMakerIdentified || lead.contactDecisionMaker) ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                {(lead.decisionMakerIdentified || lead.contactDecisionMaker) ? 'Verified Target DM' : 'Missing DM'}
              </div>
            </div>

            {/* Company Size */}
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.03))', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Company Scale</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginTop: '2px' }}>
                {lead.companySize || 'Not specified'}
              </div>
            </div>

            {/* Existing Tools */}
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.03))', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Existing Tooling</div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {lead.existingTools || 'None / Not recorded'}
              </div>
            </div>
          </div>

          {/* Qualification Summary Notes */}
          {lead.qualificationNotes && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.02))', borderRadius: '8px', fontSize: '0.8125rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: '2px' }}>Qualification Engine Summary:</div>
              <div>{lead.qualificationNotes}</div>
            </div>
          )}
        </div>

        {/* SECTION: SALES NOTES */}
        <div
          style={{
            padding: '1rem',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Internal Deal Notes
            </div>
            {onUpdateNotes && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '3px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
              >
                {isSavingNotes ? (
                  <>
                    <Loader2 size={12} className="spin" /> Saving...
                  </>
                ) : notesSavedSuccess ? (
                  <>
                    <CheckCircle2 size={12} /> Saved!
                  </>
                ) : (
                  <>
                    <Save size={12} /> Save Notes
                  </>
                )}
              </button>
            )}
          </div>
          <textarea
            className="input"
            rows={3}
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            placeholder="Add deal context, discovery feedback, next meeting notes..."
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* SECTION: STAGE TRANSITION HISTORY AUDIT TRAIL */}
        {lead.stageHistory && lead.stageHistory.length > 0 && (
          <div
            style={{
              padding: '1rem',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              Stage Transition History & Traceability
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {lead.stageHistory.map((item, idx) => (
                <div
                  key={item.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.02))',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div style={{ minWidth: '130px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Recent'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                      {item.fromStage ? (
                        <span>
                          {item.fromStage} <span style={{ color: 'var(--text-muted)' }}>→</span> {item.toStage}
                        </span>
                      ) : (
                        <span>Initial: {item.toStage}</span>
                      )}
                      {item.lostReason && (
                        <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>
                          (Reason: {item.lostReason})
                        </span>
                      )}
                    </div>
                    {item.notes && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
                        {item.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
