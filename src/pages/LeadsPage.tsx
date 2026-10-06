import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PageHeader,
  Table,
  Column,
  EmptyState,
  ErrorState,
  TableSkeleton,
} from '../components/common';
import {
  Plus,
  DollarSign,
  TrendingUp,
  Target,
  Eye,
  Edit2,
  Trash2,
  Building2,
  Star,
  Zap,
  AlertTriangle,
  RefreshCw,
  LayoutGrid,
  List,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { leadService } from '../api';
import {
  Lead,
  LeadStatus,
  LeadDiscoveryFilterParams,
  CreateLeadPayload,
} from '../types';
import {
  LeadFormModal,
  LeadDetailModal,
  ArchiveLeadModal,
  StageChangeModal,
  LeadKanbanBoard,
  LeadDiscoveryFilters,
} from '../components/leads';

const PIPELINE_BOARD_STAGES: LeadStatus[] = [
  'New',
  'Contacted',
  'Replied',
  'Demo Booked',
  'Demo Done',
  'Won',
  'Lost',
];

const STAGE_COLOR_MAP: Record<string, { bg: string; color: string; border: string }> = {
  New: { bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
  Contacted: { bg: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9', border: 'rgba(14, 165, 233, 0.3)' },
  Replied: { bg: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.3)' },
  'Demo Booked': { bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
  'Demo Done': { bg: 'rgba(236, 72, 153, 0.12)', color: '#ec4899', border: 'rgba(236, 72, 153, 0.3)' },
  Won: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'rgba(16, 185, 129, 0.35)' },
  Lost: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.35)' },
};

const INITIAL_FILTERS: LeadDiscoveryFilterParams = {
  search: '',
  product: '',
  priority: '',
  status: '',
  source: '',
  campaign: '',
  existingTools: '',
  followUpStatus: '',
  industry: '',
  location: '',
  employeeSize: '',
  hiringVolume: '',
  leadSignals: '',
  productFit: '',
  jobTitle: '',
  decisionMaker: '',
  company: '',
  productRelevance: '',
  includeArchived: false,
};

export const LeadsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // List view leads
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Kanban view grouped leads
  const [pipelineGroups, setPipelineGroups] = useState<Partial<Record<LeadStatus, Lead[]>>>({
    New: [],
    Contacted: [],
    Replied: [],
    'Demo Booked': [],
    'Demo Done': [],
    Won: [],
    Lost: [],
  });

  // Discovery Filters
  const [discoveryFilters, setDiscoveryFilters] = useState<LeadDiscoveryFilterParams>(INITIAL_FILTERS);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);
  const [leadToArchive, setLeadToArchive] = useState<Lead | null>(null);

  // Stage change modal state
  const [stageChangeLead, setStageChangeLead] = useState<Lead | null>(null);
  const [stageChangeTarget, setStageChangeTarget] = useState<LeadStatus | null>(null);

  // Fetch paginated leads for Table view
  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: LeadDiscoveryFilterParams = {
        ...discoveryFilters,
        page,
        limit: pageSize,
      };
      const res = await leadService.getLeads(params);
      if (res.data) {
        setLeads(res.data.items || []);
        setTotal(res.data.total || 0);
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || 'Unable to connect to lead discovery service.');
    } finally {
      setLoading(false);
    }
  }, [discoveryFilters, page, pageSize]);

  // Fetch pipeline grouped leads for Kanban view
  const loadPipeline = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await leadService.getPipeline(discoveryFilters);
      if (res.data) {
        const grouped: Partial<Record<LeadStatus, Lead[]>> = {
          New: [],
          Contacted: [],
          Replied: [],
          'Demo Booked': [],
          'Demo Done': [],
          Won: [],
          Lost: [],
        };
        res.data.forEach((group) => {
          if (grouped[group.stage as LeadStatus]) {
            grouped[group.stage as LeadStatus] = group.leads || [];
          }
        });
        setPipelineGroups(grouped);
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || 'Unable to connect to lead pipeline service.');
    } finally {
      setLoading(false);
    }
  }, [discoveryFilters]);

  // Load appropriate data on view or filter change
  useEffect(() => {
    if (viewMode === 'kanban') {
      loadPipeline();
    } else {
      loadLeads();
    }
  }, [viewMode, loadPipeline, loadLeads]);

  // Quick stats calculation
  const stats = useMemo(() => {
    const allLeads =
      viewMode === 'kanban'
        ? Object.values(pipelineGroups).flat()
        : leads;

    let pipelineTotal = 0;
    let highPriorityCount = 0;
    let activeDealsCount = 0;

    allLeads.forEach((l) => {
      pipelineTotal += l.value || 0;
      if (l.priority === 'High') highPriorityCount += 1;
      if (['Contacted', 'Replied', 'Demo Booked', 'Demo Done', 'Won'].includes(l.status)) {
        activeDealsCount += 1;
      }
    });

    return {
      pipelineTotal,
      highPriorityCount,
      activeDealsCount,
      totalCount: viewMode === 'kanban' ? allLeads.length : total,
    };
  }, [viewMode, pipelineGroups, leads, total]);

  const handleFiltersChange = (newFilters: LeadDiscoveryFilterParams) => {
    setDiscoveryFilters(newFilters);
    setPage(1);
  };

  const handleResetFilters = () => {
    setDiscoveryFilters(INITIAL_FILTERS);
    setPage(1);
  };

  const handleCreateOrUpdate = async (payload: CreateLeadPayload) => {
    if (leadToEdit) {
      await leadService.updateLead(leadToEdit.id, payload);
    } else {
      await leadService.createLead(payload);
    }
    setLeadToEdit(null);
    setIsCreateModalOpen(false);
    if (viewMode === 'kanban') {
      loadPipeline();
    } else {
      loadLeads();
    }
  };

  const handleArchiveConfirm = async (lead: Lead, permanent?: boolean) => {
    if (permanent) {
      await leadService.deleteLead(lead.id, true);
    } else {
      await leadService.archiveLead(lead.id);
    }
    setLeadToArchive(null);
    if (viewMode === 'kanban') {
      loadPipeline();
    } else {
      loadLeads();
    }
  };

  const handleUpdateNotes = async (leadId: string, notes: string) => {
    await leadService.updateLead(leadId, { notes });
    if (selectedLeadForDetail && selectedLeadForDetail.id === leadId) {
      setSelectedLeadForDetail({ ...selectedLeadForDetail, notes });
    }
    if (viewMode === 'kanban') {
      loadPipeline();
    } else {
      loadLeads();
    }
  };

  // Stage change trigger
  const handleRequestStageChange = (lead: Lead, targetStage: LeadStatus) => {
    setStageChangeLead(lead);
    setStageChangeTarget(targetStage);
  };

  // Stage change confirm & immediate UI state update
  const handleStageChangeConfirm = async (
    leadId: string,
    targetStage: LeadStatus,
    lostReason?: string,
    notes?: string
  ) => {
    const res = await leadService.changeStage(leadId, {
      stage: targetStage,
      lostReason,
      notes,
    });

    if (res.data) {
      const updatedLead = res.data;

      // 1. Immediately update leads list
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? updatedLead : l))
      );

      // 2. Immediately update pipeline groups
      setPipelineGroups((prev) => {
        const next: Partial<Record<LeadStatus, Lead[]>> = { ...prev };
        (Object.keys(next) as LeadStatus[]).forEach((stg) => {
          const list = next[stg];
          if (list) {
            next[stg] = list.filter((l) => l.id !== leadId);
          }
        });
        const currentTargetList = next[targetStage] || [];
        next[targetStage] = [updatedLead, ...currentTargetList];
        return next;
      });

      // 3. Immediately update selected lead modal if open
      if (selectedLeadForDetail && selectedLeadForDetail.id === leadId) {
        setSelectedLeadForDetail(updatedLead);
      }
    }

    // Background sync to ensure consistency
    if (viewMode === 'kanban') {
      loadPipeline();
    } else {
      loadLeads();
    }
  };

  const columns: Column<Lead>[] = [
    {
      key: 'title',
      header: 'Opportunity & Account',
      sortable: true,
      render: (row) => (
        <div>
          <div
            style={{ fontWeight: 700, cursor: 'pointer', color: 'var(--text-primary)' }}
            onClick={() => setSelectedLeadForDetail(row)}
          >
            {row.title}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <Building2 size={12} />
            <span style={{ fontWeight: 600 }}>{row.companyName}</span>
            {row.companyIndustry && (
              <span style={{ fontSize: '0.75rem', opacity: 0.75 }}>• {row.companyIndustry}</span>
            )}
            {row.companyLocation && (
              <span style={{ fontSize: '0.75rem', opacity: 0.75 }}>• {row.companyLocation}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'contactName',
      header: 'Primary Contact',
      render: (row) => (
        <div>
          {row.contactName ? (
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                {row.contactDecisionMaker && <Star size={12} fill="#f59e0b" color="#f59e0b" />}
                <span>{row.contactName}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {row.contactTitle || 'Contact'}
              </div>
            </div>
          ) : (
            <span style={{ fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <AlertTriangle size={11} /> No Contact
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Product & Tools',
      sortable: true,
      render: (row) => {
        let bg = 'rgba(59, 130, 246, 0.12)';
        let color = '#3b82f6';
        let border = 'rgba(59, 130, 246, 0.25)';

        if (row.product === 'HRMS Portal') {
          bg = 'rgba(139, 92, 246, 0.12)';
          color = '#8b5cf6';
          border = 'rgba(139, 92, 246, 0.25)';
        } else if (row.product === 'Both') {
          bg = 'rgba(16, 185, 129, 0.12)';
          color = '#10b981';
          border = 'rgba(16, 185, 129, 0.25)';
        }

        const tools = row.existingTools ? row.existingTools.split(',').map((t) => t.trim()).slice(0, 2) : [];

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: bg,
                color,
                border: `1px solid ${border}`,
                display: 'inline-block',
                width: 'fit-content',
              }}
            >
              {row.product}
            </span>
            {tools.length > 0 && (
              <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                {tools.map((t, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '0.6875rem',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.05))',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'priority',
      header: 'Priority & Signals',
      sortable: true,
      render: (row) => {
        const p = row.priority;
        const isHigh = p === 'High';
        const isMed = p === 'Medium';
        const signals = row.detectedSignals || [];

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 800,
                backgroundColor: isHigh
                  ? 'rgba(239, 68, 68, 0.12)'
                  : isMed
                  ? 'rgba(245, 158, 11, 0.12)'
                  : 'rgba(100, 116, 139, 0.12)',
                color: isHigh ? '#ef4444' : isMed ? '#f59e0b' : '#64748b',
                border: `1px solid ${
                  isHigh
                    ? 'rgba(239, 68, 68, 0.25)'
                    : isMed
                    ? 'rgba(245, 158, 11, 0.25)'
                    : 'rgba(100, 116, 139, 0.2)'
                }`,
                display: 'inline-block',
                width: 'fit-content',
              }}
            >
              {p}
            </span>

            {signals.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
                {signals.slice(0, 2).map((sig, sIdx) => (
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
                {signals.length > 2 && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    +{signals.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'followUpStatus',
      header: 'Follow-Up Status',
      render: (row) => {
        const st = row.followUpStatus || 'No Follow-up';
        const isOverdue = st === 'Overdue';
        const isDueToday = st === 'Due Today';
        const isScheduled = st === 'Scheduled';

        return (
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: isOverdue
                ? 'rgba(239, 68, 68, 0.12)'
                : isDueToday
                ? 'rgba(245, 158, 11, 0.12)'
                : isScheduled
                ? 'rgba(59, 130, 246, 0.12)'
                : 'rgba(100, 116, 139, 0.1)',
              color: isOverdue
                ? '#ef4444'
                : isDueToday
                ? '#f59e0b'
                : isScheduled
                ? '#3b82f6'
                : 'var(--text-muted)',
              border: `1px solid ${
                isOverdue
                  ? 'rgba(239, 68, 68, 0.25)'
                  : isDueToday
                  ? 'rgba(245, 158, 11, 0.25)'
                  : isScheduled
                  ? 'rgba(59, 130, 246, 0.25)'
                  : 'var(--border-color)'
              }`,
            }}
          >
            <Clock size={11} />
            {st}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Stage',
      sortable: true,
      render: (row) => {
        const st = STAGE_COLOR_MAP[row.status] || {
          bg: 'var(--bg-subtle, rgba(255,255,255,0.06))',
          color: 'var(--text-primary)',
          border: 'var(--border-color)',
        };
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 700,
                backgroundColor: st.bg,
                color: st.color,
                border: `1px solid ${st.border}`,
                display: 'inline-block',
                width: 'fit-content',
              }}
            >
              {row.status}
            </span>
            {row.status === 'Lost' && row.lostReason && (
              <span
                style={{
                  fontSize: '0.7rem',
                  color: '#ef4444',
                  opacity: 0.85,
                  maxWidth: '140px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={row.lostReason}
              >
                {row.lostReason}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'value',
      header: 'Value & Score',
      sortable: true,
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--status-success-text, #10b981)', fontSize: '0.875rem' }}>
            ${(row.value || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Score: <strong style={{ color: row.qualificationScore >= 70 ? '#10b981' : row.qualificationScore >= 40 ? '#f59e0b' : 'inherit' }}>{row.qualificationScore}</strong>
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => {
        const nextStageMap: Record<string, LeadStatus> = {
          New: 'Contacted',
          Contacted: 'Replied',
          Replied: 'Demo Booked',
          'Demo Booked': 'Demo Done',
          'Demo Done': 'Won',
          Won: 'Demo Done',
          Lost: 'Contacted',
        };
        const nextStage = nextStageMap[row.status] || 'Contacted';

        return (
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              title={`Move to ${nextStage}`}
              style={{ padding: '4px 6px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '2px' }}
              onClick={() => handleRequestStageChange(row, nextStage)}
            >
              <span>{nextStage}</span>
              <ArrowRight size={11} />
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              title="View Details"
              style={{ padding: '4px 6px' }}
              onClick={() => setSelectedLeadForDetail(row)}
            >
              <Eye size={14} />
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              title="Edit Lead"
              style={{ padding: '4px 6px' }}
              onClick={() => {
                setLeadToEdit(row);
                setIsCreateModalOpen(true);
              }}
            >
              <Edit2 size={14} />
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              title="Archive / Delete"
              style={{ padding: '4px 6px', color: '#ef4444' }}
              onClick={() => setLeadToArchive(row)}
            >
              <Trash2 size={14} />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Lead Discovery & Qualification Pipeline"
        description="Discover high-value prospects with HireIQ & HRMS lead signals, tool intelligence, and multi-dimensional search."
        breadcrumbs={[{ label: 'Home' }, { label: 'Pipeline', active: true }]}
        actions={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* View Mode Toggle */}
            <div
              style={{
                display: 'inline-flex',
                backgroundColor: 'var(--bg-subtle, rgba(255, 255, 255, 0.06))',
                borderRadius: '8px',
                padding: '3px',
                border: '1px solid var(--border-color)',
                gap: '2px',
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'kanban' ? 'var(--primary-color, #3b82f6)' : 'transparent',
                  color: viewMode === 'kanban' ? '#ffffff' : 'var(--text-muted)',
                  transition: 'all 0.15s ease',
                }}
              >
                <LayoutGrid size={15} />
                <span>Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'list' ? 'var(--primary-color, #3b82f6)' : 'transparent',
                  color: viewMode === 'list' ? '#ffffff' : 'var(--text-muted)',
                  transition: 'all 0.15s ease',
                }}
              >
                <List size={15} />
                <span>List View</span>
              </button>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (viewMode === 'kanban') loadPipeline();
                else loadLeads();
              }}
              title="Refresh"
            >
              <RefreshCw size={15} />
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setLeadToEdit(null);
                setIsCreateModalOpen(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} />
              <span>Create Lead</span>
            </button>
          </div>
        }
      />

      {/* METRIC KPI CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Pipeline Value */}
        <div
          style={{
            padding: '1.125rem',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
            }}
          >
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Pipeline Value
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              ${stats.pipelineTotal.toLocaleString()}
            </div>
          </div>
        </div>

        {/* High Priority Leads */}
        <div
          style={{
            padding: '1.125rem',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
            }}
          >
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              High Priority Leads
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ef4444' }}>
              {stats.highPriorityCount} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Verified DM</span>
            </div>
          </div>
        </div>

        {/* Active Deals */}
        <div
          style={{
            padding: '1.125rem',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              color: '#3b82f6',
            }}
          >
            <Target size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Active In Pipeline
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {stats.activeDealsCount} Deals
            </div>
          </div>
        </div>

        {/* Total Opportunities */}
        <div
          style={{
            padding: '1.125rem',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              color: '#8b5cf6',
            }}
          >
            <Zap size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Total Opportunities
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {stats.totalCount} Leads
            </div>
          </div>
        </div>
      </div>

      {/* ADVANCED LEAD DISCOVERY & FILTERS */}
      <LeadDiscoveryFilters
        filters={discoveryFilters}
        onChange={handleFiltersChange}
        onReset={handleResetFilters}
        totalResults={stats.totalCount}
        loading={loading}
      />

      {/* ERROR STATE */}
      {error && (
        <div style={{ marginBottom: '1.5rem' }}>
          <ErrorState
            title="Failed to load lead intelligence"
            message={error}
            onRetry={() => {
              if (viewMode === 'kanban') loadPipeline();
              else loadLeads();
            }}
          />
        </div>
      )}

      {/* VIEW RENDER: KANBAN BOARD OR LIST TABLE */}
      {!error && (
        <>
          {viewMode === 'kanban' ? (
            stats.totalCount === 0 && !loading ? (
              <EmptyState
                title="No Leads Found in Pipeline"
                description="No prospects matched your current search and discovery filter criteria."
                action={{
                  label: 'Reset All Filters',
                  onClick: handleResetFilters,
                }}
              />
            ) : (
              <LeadKanbanBoard
                stages={PIPELINE_BOARD_STAGES}
                leadsByStage={pipelineGroups}
                onLeadClick={(lead) => setSelectedLeadForDetail(lead)}
                onRequestStageChange={handleRequestStageChange}
                loading={loading}
              />
            )
          ) : loading && leads.length === 0 ? (
            <TableSkeleton rows={6} cols={7} />
          ) : leads.length === 0 ? (
            <EmptyState
              title="No Leads Found"
              description="No prospects matched your current search and discovery filter criteria."
              action={{
                label: 'Reset All Filters',
                onClick: handleResetFilters,
              }}
            />
          ) : (
            <Table
              columns={columns}
              data={leads}
              loading={loading}
              keyExtractor={(row) => row.id}
              pagination={{
                page,
                limit: pageSize,
                total,
                onPageChange: (newPage) => setPage(newPage),
              }}
              emptyTitle="No Leads Found"
              emptyDescription="No prospects matched your current search and discovery filter criteria."
            />
          )}
        </>
      )}

      {/* CREATE / EDIT MODAL */}
      <LeadFormModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setLeadToEdit(null);
        }}
        onSubmit={handleCreateOrUpdate}
        leadToEdit={leadToEdit}
      />

      {/* DETAIL MODAL */}
      <LeadDetailModal
        isOpen={Boolean(selectedLeadForDetail)}
        lead={selectedLeadForDetail}
        onClose={() => setSelectedLeadForDetail(null)}
        onEdit={(lead) => {
          setSelectedLeadForDetail(null);
          setLeadToEdit(lead);
          setIsCreateModalOpen(true);
        }}
        onDelete={(lead) => {
          setSelectedLeadForDetail(null);
          setLeadToArchive(lead);
        }}
        onUpdateNotes={handleUpdateNotes}
        onRequestStageChange={handleRequestStageChange}
      />

      {/* ARCHIVE / DELETE MODAL */}
      <ArchiveLeadModal
        isOpen={Boolean(leadToArchive)}
        lead={leadToArchive}
        onClose={() => setLeadToArchive(null)}
        onConfirm={handleArchiveConfirm}
      />

      {/* STAGE CHANGE MODAL */}
      <StageChangeModal
        isOpen={Boolean(stageChangeLead && stageChangeTarget)}
        lead={stageChangeLead}
        targetStage={stageChangeTarget}
        onClose={() => {
          setStageChangeLead(null);
          setStageChangeTarget(null);
        }}
        onConfirm={handleStageChangeConfirm}
      />
    </div>
  );
};
