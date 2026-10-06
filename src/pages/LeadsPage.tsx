import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PageHeader,
  Table,
  Column,
} from '../components/common';
import {
  Plus,
  DollarSign,
  TrendingUp,
  Target,
  Search,
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
} from 'lucide-react';
import { leadService } from '../api';
import {
  Lead,
  LeadStatus,
  LeadFilterParams,
  CreateLeadPayload,
} from '../types';
import {
  LeadFormModal,
  LeadDetailModal,
  ArchiveLeadModal,
  StageChangeModal,
  LeadKanbanBoard,
} from '../components/leads';

const PRODUCTS: Array<{ label: string; value: string }> = [
  { label: 'All Products', value: '' },
  { label: 'Higher IQ', value: 'Higher IQ' },
  { label: 'HRMS Portal', value: 'HRMS Portal' },
  { label: 'Both Suites', value: 'Both' },
];

const PRIORITIES: Array<{ label: string; value: string }> = [
  { label: 'All Priorities', value: '' },
  { label: 'High Priority', value: 'High' },
  { label: 'Medium Priority', value: 'Medium' },
  { label: 'Low Priority', value: 'Low' },
];

const STAGES: Array<{ label: string; value: string }> = [
  { label: 'All Stages', value: '' },
  { label: 'New', value: 'New' },
  { label: 'Contacted', value: 'Contacted' },
  { label: 'Replied', value: 'Replied' },
  { label: 'Demo Booked', value: 'Demo Booked' },
  { label: 'Demo Done', value: 'Demo Done' },
  { label: 'Won', value: 'Won' },
  { label: 'Lost', value: 'Lost' },
];

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

export const LeadsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
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

  // Filters
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);

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
    try {
      const params: LeadFilterParams = {
        page,
        limit: pageSize,
        search: search.trim() || undefined,
        product: productFilter || undefined,
        priority: priorityFilter || undefined,
        status: statusFilter || undefined,
        includeArchived,
      };
      const res = await leadService.getLeads(params);
      if (res.data) {
        setLeads(res.data.items || []);
        setTotal(res.data.total || 0);
      }
    } catch {
      // Backend error fallback
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, productFilter, priorityFilter, statusFilter, includeArchived]);

  // Fetch pipeline grouped leads for Kanban view
  const loadPipeline = useCallback(async () => {
    setLoading(true);
    try {
      const params: LeadFilterParams = {
        search: search.trim() || undefined,
        product: productFilter || undefined,
        priority: priorityFilter || undefined,
        status: statusFilter || undefined,
        includeArchived,
      };
      const res = await leadService.getPipeline(params);
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
    } catch {
      // Backend error fallback
    } finally {
      setLoading(false);
    }
  }, [search, productFilter, priorityFilter, statusFilter, includeArchived]);

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
      header: 'Opportunity Title & Account',
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
            <span>{row.companyName}</span>
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
      header: 'Product',
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

        return (
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
            }}
          >
            {row.product}
          </span>
        );
      },
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      render: (row) => {
        const p = row.priority;
        const isHigh = p === 'High';
        const isMed = p === 'Medium';
        return (
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
            }}
          >
            {p}
          </span>
        );
      },
    },
    {
      key: 'qualificationScore',
      header: 'Fit Score',
      sortable: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: '0.875rem',
              color:
                row.qualificationScore >= 70
                  ? '#10b981'
                  : row.qualificationScore >= 40
                  ? '#f59e0b'
                  : 'var(--text-muted)',
              minWidth: '24px',
            }}
          >
            {row.qualificationScore}
          </div>
          <div
            style={{
              width: '45px',
              height: '5px',
              backgroundColor: 'var(--border-color)',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(row.qualificationScore, 100)}%`,
                backgroundColor:
                  row.qualificationScore >= 70
                    ? '#10b981'
                    : row.qualificationScore >= 40
                    ? '#f59e0b'
                    : '#64748b',
              }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      sortable: true,
      render: (row) => (
        <div style={{ fontWeight: 700, color: 'var(--status-success-text, #10b981)', fontSize: '0.875rem' }}>
          ${(row.value || 0).toLocaleString()}
        </div>
      ),
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
        title="Lead Pipeline & Qualification"
        description="Track opportunities across stages: New → Contacted → Replied → Demo Booked → Demo Done → Won / Lost."
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

      {/* FILTER CONTROLS */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          padding: '1rem',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
        }}
      >
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 240px', minWidth: '220px' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search lead title, account..."
            style={{ width: '100%' }}
          />
        </div>

        {/* Product Filter */}
        <select
          className="input"
          value={productFilter}
          onChange={(e) => {
            setProductFilter(e.target.value);
            setPage(1);
          }}
          style={{ width: '160px' }}
        >
          {PRODUCTS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          className="input"
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value);
            setPage(1);
          }}
          style={{ width: '160px' }}
        >
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        {/* Stage Filter */}
        <select
          className="input"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          style={{ width: '160px' }}
        >
          {STAGES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Include Archived toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => {
              setIncludeArchived(e.target.checked);
              setPage(1);
            }}
          />
          <span>Archived</span>
        </label>
      </div>

      {/* VIEW RENDER: KANBAN BOARD OR LIST TABLE */}
      {viewMode === 'kanban' ? (
        <LeadKanbanBoard
          stages={PIPELINE_BOARD_STAGES}
          leadsByStage={pipelineGroups}
          onLeadClick={(lead) => setSelectedLeadForDetail(lead)}
          onRequestStageChange={handleRequestStageChange}
          loading={loading}
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
          emptyDescription="Create your first qualified opportunity to track fit signals, product solutions, and decision makers."
        />
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
