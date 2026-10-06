import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { StatusBadge, PriorityBadge } from '../common';
import { Campaign, Lead } from '../../types';
import { campaignService } from '../../api';
import {
  Calendar,
  Users,
  TrendingUp,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export interface CampaignDetailModalProps {
  isOpen: boolean;
  campaignId: string | null;
  onClose: () => void;
  onEdit?: (campaign: Campaign) => void;
  onSelectLead?: (lead: Lead) => void;
}

export const CampaignDetailModal: React.FC<CampaignDetailModalProps> = ({
  isOpen,
  campaignId,
  onClose,
  onEdit,
  onSelectLead,
}) => {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId || !isOpen) {
      setCampaign(null);
      setLeads([]);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const [cmpRes, leadsRes] = await Promise.all([
          campaignService.getCampaignById(campaignId),
          campaignService.getCampaignLeads(campaignId),
        ]);

        if (cmpRes.data) {
          setCampaign(cmpRes.data);
        }
        if (leadsRes.data) {
          setLeads(leadsRes.data);
        }
      } catch (err: unknown) {
        const e = err as { message?: string };
        setError(e.message || 'Failed to load campaign details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [campaignId, isOpen]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={campaign ? campaign.name : 'Campaign Overview'}
      maxWidth="860px"
    >
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
          <p>Computing live lead funnel metrics...</p>
        </div>
      ) : error ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--status-error)' }}>
          <AlertCircle size={32} style={{ margin: '0 auto 1rem' }} />
          <p>{error}</p>
        </div>
      ) : campaign ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Top Metadata Header */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                <span
                  style={{
                    padding: '0.25rem 0.65rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    color: 'var(--primary-400)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                  }}
                >
                  {campaign.product}
                </span>
                <StatusBadge status={campaign.status} />
                {campaign.leadSource && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Source: <strong style={{ color: 'var(--text-primary)' }}>{campaign.leadSource}</strong>
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Audience: <strong>{campaign.targetAudience || 'Any'}</strong> • Industry:{' '}
                <strong>{campaign.industry || 'All'}</strong> • Location:{' '}
                <strong>{campaign.location || 'Pan-India'}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                <div>
                  <Calendar size={13} style={{ display: 'inline', marginRight: '4px' }} />
                  {campaign.startDate?.split('T')[0]} {campaign.endDate ? `to ${campaign.endDate.split('T')[0]}` : ''}
                </div>
                {campaign.assignedUserName && <div>Assigned: {campaign.assignedUserName}</div>}
              </div>

              {onEdit && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    onClose();
                    onEdit(campaign);
                  }}
                >
                  Edit
                </button>
              )}
            </div>
          </div>

          {/* Strategy Notes */}
          {campaign.notes && (
            <div
              style={{
                padding: '0.85rem 1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '8px',
                borderLeft: '3px solid var(--primary-500)',
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
              }}
            >
              {campaign.notes}
            </div>
          )}

          {/* LIVE FUNNEL METRICS GRID */}
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} color="var(--primary-400)" />
              Campaign Funnel Performance & Velocity
            </h4>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.75rem',
              }}
            >
              <div style={metricBoxStyle}>
                <span style={metricLabelStyle}>Total Leads</span>
                <span style={{ ...metricValueStyle, color: 'var(--primary-400)' }}>{campaign.totalLeads}</span>
              </div>

              <div style={metricBoxStyle}>
                <span style={metricLabelStyle}>New Leads</span>
                <span style={metricValueStyle}>{campaign.newLeads}</span>
              </div>

              <div style={metricBoxStyle}>
                <span style={metricLabelStyle}>Contacted</span>
                <span style={{ ...metricValueStyle, color: 'var(--status-info)' }}>{campaign.contacted}</span>
              </div>

              <div style={metricBoxStyle}>
                <span style={metricLabelStyle}>Replies</span>
                <span style={{ ...metricValueStyle, color: '#a855f7' }}>{campaign.replies}</span>
              </div>

              <div style={metricBoxStyle}>
                <span style={metricLabelStyle}>Demos Booked</span>
                <span style={{ ...metricValueStyle, color: '#f59e0b' }}>{campaign.demosBooked}</span>
              </div>

              <div style={metricBoxStyle}>
                <span style={metricLabelStyle}>Demos Done</span>
                <span style={{ ...metricValueStyle, color: '#10b981' }}>{campaign.demosCompleted}</span>
              </div>

              <div style={metricBoxStyle}>
                <span style={metricLabelStyle}>Won</span>
                <span style={{ ...metricValueStyle, color: 'var(--status-success)' }}>{campaign.won}</span>
              </div>

              <div style={metricBoxStyle}>
                <span style={metricLabelStyle}>Lost</span>
                <span style={{ ...metricValueStyle, color: 'var(--text-muted)' }}>{campaign.lost}</span>
              </div>

              <div
                style={{
                  ...metricBoxStyle,
                  borderColor: campaign.followUpsDue > 0 ? 'var(--status-warning)' : 'var(--border-color)',
                  backgroundColor: campaign.followUpsDue > 0 ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-card)',
                }}
              >
                <span style={metricLabelStyle}>Follow-ups Due</span>
                <span
                  style={{
                    ...metricValueStyle,
                    color: campaign.followUpsDue > 0 ? 'var(--status-warning)' : 'var(--text-primary)',
                  }}
                >
                  {campaign.followUpsDue}
                </span>
              </div>

              <div
                style={{
                  ...metricBoxStyle,
                  borderColor: 'rgba(16, 185, 129, 0.4)',
                  backgroundColor: 'rgba(16, 185, 129, 0.06)',
                }}
              >
                <span style={metricLabelStyle}>Conversion Rate</span>
                <span style={{ ...metricValueStyle, color: 'var(--status-success)' }}>
                  {campaign.conversionRate}%
                </span>
              </div>
            </div>
          </div>

          {/* FUNNEL PROGRESS BAR */}
          {campaign.totalLeads > 0 && (
            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                <span>Funnel Distribution ({campaign.totalLeads} Total Leads)</span>
                <span>Won: {campaign.won} ({campaign.conversionRate}%)</span>
              </div>
              <div style={{ height: '10px', width: '100%', borderRadius: '5px', backgroundColor: 'var(--bg-secondary)', overflow: 'hidden', display: 'flex' }}>
                <div title={`New: ${campaign.newLeads}`} style={{ width: `${(campaign.newLeads / campaign.totalLeads) * 100}%`, backgroundColor: '#64748b' }} />
                <div title={`Contacted: ${campaign.contacted}`} style={{ width: `${(campaign.contacted / campaign.totalLeads) * 100}%`, backgroundColor: 'var(--primary-500)' }} />
                <div title={`Replies: ${campaign.replies}`} style={{ width: `${(campaign.replies / campaign.totalLeads) * 100}%`, backgroundColor: '#a855f7' }} />
                <div title={`Demos: ${campaign.demosBooked}`} style={{ width: `${(campaign.demosBooked / campaign.totalLeads) * 100}%`, backgroundColor: '#f59e0b' }} />
                <div title={`Won: ${campaign.won}`} style={{ width: `${(campaign.won / campaign.totalLeads) * 100}%`, backgroundColor: 'var(--status-success)' }} />
                <div title={`Lost: ${campaign.lost}`} style={{ width: `${(campaign.lost / campaign.totalLeads) * 100}%`, backgroundColor: '#ef4444' }} />
              </div>
            </div>
          )}

          {/* ENROLLED LEADS TABLE */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} color="var(--primary-400)" />
                Enrolled Leads ({leads.length})
              </h4>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Click a lead to inspect pipeline details
              </span>
            </div>

            {leads.length === 0 ? (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '10px',
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                }}
              >
                No leads currently tagged with this campaign. Select this campaign when creating or editing leads.
              </div>
            ) : (
              <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                <table className="table" style={{ margin: 0, width: '100%', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Company & Lead</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Contact</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Stage</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Priority</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Value</th>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          <div style={{ fontWeight: 600 }}>{lead.companyName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lead.title}</div>
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          <div>{lead.contactName || '—'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lead.contactTitle || ''}</div>
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          <StatusBadge status={lead.status} />
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          <PriorityBadge priority={lead.priority} />
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>
                          ${(lead.value || 0).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                          {onSelectLead && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                onClose();
                                onSelectLead(lead);
                              }}
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                            >
                              <span>View</span>
                              <ExternalLink size={12} style={{ marginLeft: '4px' }} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
};

const metricBoxStyle: React.CSSProperties = {
  padding: '0.85rem 0.75rem',
  backgroundColor: 'var(--bg-card)',
  borderRadius: '10px',
  border: '1px solid var(--border-color)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
};

const metricLabelStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--text-muted)',
  marginBottom: '0.35rem',
};

const metricValueStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
};
