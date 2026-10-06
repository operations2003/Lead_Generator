import React from 'react';
import { Lead, LeadStatus } from '../../types';
import {
  Building2,
  Star,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Clock,
  Sparkles,
} from 'lucide-react';

export interface LeadKanbanBoardProps {
  stages: LeadStatus[];
  leadsByStage: Partial<Record<LeadStatus, Lead[]>>;
  onLeadClick: (lead: Lead) => void;
  onRequestStageChange: (lead: Lead, targetStage: LeadStatus) => void;
  loading?: boolean;
}

const STAGE_CONFIG: Record<
  LeadStatus,
  { label: string; headerColor: string; bgAccent: string }
> = {
  New: {
    label: 'New Leads',
    headerColor: '#3b82f6',
    bgAccent: 'rgba(59, 130, 246, 0.08)',
  },
  Contacted: {
    label: 'Contacted',
    headerColor: '#0ea5e9',
    bgAccent: 'rgba(14, 165, 233, 0.08)',
  },
  Replied: {
    label: 'Replied',
    headerColor: '#8b5cf6',
    bgAccent: 'rgba(139, 92, 246, 0.08)',
  },
  'Demo Booked': {
    label: 'Demo Booked',
    headerColor: '#f59e0b',
    bgAccent: 'rgba(245, 158, 11, 0.08)',
  },
  'Demo Done': {
    label: 'Demo Done',
    headerColor: '#ec4899',
    bgAccent: 'rgba(236, 72, 153, 0.08)',
  },
  Won: {
    label: 'Closed Won',
    headerColor: '#10b981',
    bgAccent: 'rgba(16, 185, 129, 0.08)',
  },
  Lost: {
    label: 'Closed Lost',
    headerColor: '#ef4444',
    bgAccent: 'rgba(239, 68, 68, 0.08)',
  },
  Archived: {
    label: 'Archived',
    headerColor: '#64748b',
    bgAccent: 'rgba(100, 116, 139, 0.08)',
  },
};

export const LeadKanbanBoard: React.FC<LeadKanbanBoardProps> = ({
  stages,
  leadsByStage,
  onLeadClick,
  onRequestStageChange,
  loading = false,
}) => {
  const getProductColor = (product: string) => {
    if (product === 'Higher IQ') return '#3b82f6';
    if (product === 'HRMS Portal') return '#8b5cf6';
    return '#10b981';
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: `repeat(${stages.length}, minmax(280px, 1fr))`,
        gap: '1rem',
        overflowX: 'auto',
        paddingBottom: '1rem',
        minHeight: '650px',
        alignItems: 'start',
        opacity: loading ? 0.7 : 1,
        transition: 'opacity 0.2s ease',
      }}
    >
      {loading && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <Loader2 size={13} className="spin" />
          <span>Syncing pipeline...</span>
        </div>
      )}
      {stages.map((stage) => {
        const stageConfig = STAGE_CONFIG[stage] || {
          label: stage,
          headerColor: '#64748b',
          bgAccent: 'rgba(100, 116, 139, 0.05)',
        };
        const columnLeads = leadsByStage[stage] || [];
        const totalStageValue = columnLeads.reduce((acc, l) => acc + (l.value || 0), 0);

        return (
          <div
            key={stage}
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100vh - 240px)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            }}
          >
            {/* Column Header */}
            <div
              style={{
                padding: '0.875rem 1rem',
                borderBottom: '1px solid var(--border-color)',
                borderTop: `3px solid ${stageConfig.headerColor}`,
                backgroundColor: stageConfig.bgAccent,
                borderTopLeftRadius: '10px',
                borderTopRightRadius: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  {stageConfig.label}
                </span>
                <span
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: stageConfig.headerColor,
                  }}
                >
                  {columnLeads.length}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>
                ${totalStageValue.toLocaleString()} USD
              </div>
            </div>

            {/* Column Cards Container */}
            <div
              style={{
                padding: '0.75rem',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                flex: 1,
              }}
            >
              {columnLeads.length === 0 ? (
                <div
                  style={{
                    padding: '2rem 1rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.8125rem',
                    border: '1px dashed var(--border-color)',
                    borderRadius: '8px',
                  }}
                >
                  No leads in {stageConfig.label}
                </div>
              ) : (
                columnLeads.map((lead) => {
                  const isHigh = lead.priority === 'High';
                  const isMed = lead.priority === 'Medium';

                  return (
                    <div
                      key={lead.id}
                      style={{
                        padding: '0.875rem',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      }}
                      onClick={() => onLeadClick(lead)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.04)';
                      }}
                    >
                      {/* Top Badges: Product & Priority */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            color: getProductColor(lead.product),
                            backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.04))',
                            border: `1px solid ${getProductColor(lead.product)}33`,
                          }}
                        >
                          {lead.product}
                        </span>

                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: isHigh
                              ? 'rgba(239, 68, 68, 0.15)'
                              : isMed
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(100, 116, 139, 0.15)',
                            color: isHigh ? '#ef4444' : isMed ? '#f59e0b' : '#94a3b8',
                          }}
                        >
                          {lead.priority}
                        </span>
                      </div>

                      {/* Lead Title */}
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '4px', lineHeight: 1.3 }}>
                        {lead.title}
                      </div>

                      {/* Company Name */}
                      <div style={{ fontSize: '0.78125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                        <Building2 size={12} />
                        <span style={{ fontWeight: 600 }}>{lead.companyName}</span>
                      </div>

                      {/* Contact & Decision Maker Status */}
                      {lead.contactName ? (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                          {lead.contactDecisionMaker && <Star size={11} fill="#f59e0b" color="#f59e0b" />}
                          <span>{lead.contactName}</span>
                          <span style={{ opacity: 0.7 }}>({lead.contactTitle || 'Contact'})</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.7rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                          <AlertTriangle size={11} /> No contact attached
                        </div>
                      )}

                      {/* Signals & Follow-up Badges */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                        {lead.followUpStatus && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span
                              style={{
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                backgroundColor:
                                  lead.followUpStatus === 'Overdue'
                                    ? 'rgba(239, 68, 68, 0.15)'
                                    : lead.followUpStatus === 'Due Today'
                                    ? 'rgba(245, 158, 11, 0.15)'
                                    : lead.followUpStatus === 'Scheduled'
                                    ? 'rgba(59, 130, 246, 0.15)'
                                    : 'rgba(100, 116, 139, 0.15)',
                                color:
                                  lead.followUpStatus === 'Overdue'
                                    ? '#ef4444'
                                    : lead.followUpStatus === 'Due Today'
                                    ? '#f59e0b'
                                    : lead.followUpStatus === 'Scheduled'
                                    ? '#3b82f6'
                                    : 'var(--text-muted)',
                              }}
                            >
                              <Clock size={10} />
                              {lead.followUpStatus}
                            </span>
                          </div>
                        )}

                        {lead.detectedSignals && lead.detectedSignals.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
                            {lead.detectedSignals.slice(0, 2).map((sig, sIdx) => (
                              <span
                                key={sIdx}
                                style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 600,
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  backgroundColor: 'rgba(139, 92, 246, 0.12)',
                                  color: '#a78bfa',
                                  border: '1px solid rgba(139, 92, 246, 0.25)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                }}
                              >
                                <Sparkles size={8} />
                                {sig}
                              </span>
                            ))}
                            {lead.detectedSignals.length > 2 && (
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                +{lead.detectedSignals.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Bottom Footer: Value & Score */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: '6px',
                          borderTop: '1px solid var(--border-color)',
                          fontSize: '0.75rem',
                        }}
                      >
                        <div style={{ fontWeight: 800, color: 'var(--status-success-text, #10b981)' }}>
                          ${(lead.value || 0).toLocaleString()}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Score:</span>
                          <span
                            style={{
                              fontWeight: 800,
                              color:
                                lead.qualificationScore >= 70
                                  ? '#10b981'
                                  : lead.qualificationScore >= 40
                                  ? '#f59e0b'
                                  : 'var(--text-muted)',
                            }}
                          >
                            {lead.qualificationScore}
                          </span>
                        </div>
                      </div>

                      {/* Quick Move Trigger Buttons */}
                      <div
                        style={{
                          display: 'flex',
                          gap: '4px',
                          marginTop: '8px',
                          paddingTop: '6px',
                          borderTop: '1px dashed var(--border-color)',
                          justifyContent: 'flex-end',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {stage !== 'Won' && stage !== 'Lost' && (
                          <>
                            {stage === 'New' && (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '2px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '2px' }}
                                onClick={() => onRequestStageChange(lead, 'Contacted')}
                              >
                                <span>Contacted</span>
                                <ChevronRight size={11} />
                              </button>
                            )}
                            {stage === 'Contacted' && (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '2px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '2px' }}
                                onClick={() => onRequestStageChange(lead, 'Replied')}
                              >
                                <span>Replied</span>
                                <ChevronRight size={11} />
                              </button>
                            )}
                            {stage === 'Replied' && (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '2px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '2px' }}
                                onClick={() => onRequestStageChange(lead, 'Demo Booked')}
                              >
                                <span>Book Demo</span>
                                <ChevronRight size={11} />
                              </button>
                            )}
                            {stage === 'Demo Booked' && (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '2px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '2px' }}
                                onClick={() => onRequestStageChange(lead, 'Demo Done')}
                              >
                                <span>Demo Done</span>
                                <ChevronRight size={11} />
                              </button>
                            )}
                            {stage === 'Demo Done' && (
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ padding: '2px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '2px' }}
                                onClick={() => onRequestStageChange(lead, 'Won')}
                              >
                                <span>Mark Won</span>
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-danger"
                              style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                              onClick={() => onRequestStageChange(lead, 'Lost')}
                              title="Mark Lost"
                            >
                              Lost
                            </button>
                          </>
                        )}
                        {stage === 'Lost' && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                            onClick={() => onRequestStageChange(lead, 'Contacted')}
                          >
                            Re-engage
                          </button>
                        )}
                        {stage === 'Won' && (
                          <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>
                            Closed Deal ✓
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
