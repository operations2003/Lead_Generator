import React, { useState, useEffect, useCallback } from 'react';
import {
  PageHeader,
  Table,
  Filters,
  StatusBadge,
  Column,
} from '../components/common';
import {
  Plus,
  Sparkles,
  BarChart2,
  Eye,
  Edit2,
  Archive,
  Layers,
  Target,
  Users,
  CheckCircle,
} from 'lucide-react';
import { campaignService } from '../api';
import {
  Campaign,
  CampaignFilterParams,
  CampaignStatus,
  LEAD_SOURCES,
} from '../types';
import {
  CampaignModal,
  CampaignDetailModal,
  AtsScoreCaptureModal,
} from '../components/campaigns';

export const CampaignsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [leadSourceFilter, setLeadSourceFilter] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [isAtsModalOpen, setIsAtsModalOpen] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const params: CampaignFilterParams = {
        page,
        limit: 10,
        search: search || undefined,
        status: (statusFilter as CampaignStatus) || undefined,
        product: productFilter || undefined,
        leadSource: leadSourceFilter || undefined,
      };
      const res = await campaignService.getCampaigns(params);
      if (res.data) {
        setCampaigns(res.data.items || []);
        setTotal(res.data.total || 0);
      }
    } catch {
      // Endpoint interface ready
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, productFilter, leadSourceFilter]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // Handle Archive
  const handleArchiveCampaign = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to archive campaign "${name}"?`)) {
      return;
    }
    try {
      await campaignService.archiveCampaign(id);
      showSuccess(`Campaign "${name}" archived successfully`);
      loadCampaigns();
    } catch {
      // Handled
    }
  };

  const showSuccess = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  // Aggregated Quick Stats across loaded campaigns
  const totalEnrolled = campaigns.reduce((acc, c) => acc + (c.total_leads || c.totalLeads || 0), 0);
  const totalDemos = campaigns.reduce((acc, c) => acc + (c.demos_booked || 0), 0);
  const totalWon = campaigns.reduce((acc, c) => acc + (c.won || 0), 0);
  const avgConversion = campaigns.length
    ? Math.round(campaigns.reduce((acc, c) => acc + (c.conversion_rate || c.conversionRate || 0), 0) / campaigns.length)
    : 0;

  const columns: Column<Campaign>[] = [
    {
      key: 'name',
      header: 'Campaign Name & Product',
      sortable: true,
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{row.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: row.product === 'HireIQ' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(139, 92, 246, 0.12)',
                color: row.product === 'HireIQ' ? '#3b82f6' : '#8b5cf6',
              }}
            >
              {row.product || 'HireIQ'}
            </span>
            {row.lead_source && (
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.05))',
                  color: 'var(--text-secondary)',
                }}
              >
                Src: {row.lead_source}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'target_audience',
      header: 'Target Audience / Industry',
      render: (row) => (
        <div style={{ fontSize: '0.8125rem' }}>
          <div style={{ color: 'var(--text-primary)' }}>{row.target_audience || row.targetAudience || 'General IT/HR'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {row.industry || row.targetIndustry || 'All Industries'} • {row.location || 'Pan-India'}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'total_leads',
      header: 'Leads & Funnel',
      render: (row) => {
        const tot = row.total_leads ?? row.totalLeads ?? 0;
        const contacted = row.contacted ?? row.contactedCount ?? 0;
        return (
          <div style={{ fontSize: '0.8125rem' }}>
            <div style={{ fontWeight: 600 }}>{tot.toLocaleString()} Enrolled</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {contacted} Contacted • {row.replies ?? 0} Replied
            </div>
          </div>
        );
      },
    },
    {
      key: 'demos_booked',
      header: 'Demos / Won',
      render: (row) => (
        <div style={{ fontSize: '0.8125rem' }}>
          <div style={{ color: 'var(--primary-color, #3b82f6)', fontWeight: 600 }}>
            {row.demos_booked ?? 0} Booked ({row.demos_completed ?? 0} Done)
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--status-success-text, #10b981)' }}>
            {row.won ?? 0} Won / {row.lost ?? 0} Lost
          </div>
        </div>
      ),
    },
    {
      key: 'conversion_rate',
      header: 'Conv. Rate',
      render: (row) => {
        const rate = row.conversion_rate ?? row.conversionRate ?? 0;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, color: rate > 0 ? '#10b981' : 'var(--text-muted)' }}>
            <BarChart2 size={15} />
            <span>{rate}%</span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            title="View Funnel Details"
            onClick={() => setSelectedCampaignId(row.id)}
            style={{ padding: '6px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Eye size={13} />
            <span>Funnel</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            title="Edit Campaign"
            onClick={() => {
              setEditingCampaign(row);
              setIsCreateModalOpen(true);
            }}
            style={{ padding: '6px 8px', fontSize: '0.75rem' }}
          >
            <Edit2 size={13} />
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            title="Archive Campaign"
            onClick={() => handleArchiveCampaign(row.id, row.name)}
            style={{ padding: '6px 8px', fontSize: '0.75rem', color: '#ef4444' }}
          >
            <Archive size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <PageHeader
        title="Outreach Campaigns & Lead Sources"
        description="Run targeted product campaigns, monitor 15-day outreach sequences, track referral partners and capture inbound ATS leads."
        breadcrumbs={[{ label: 'Home' }, { label: 'Campaigns', active: true }]}
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setIsAtsModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderColor: '#10b981',
                color: '#10b981',
              }}
            >
              <Sparkles size={16} />
              <span>Capture Free ATS Lead</span>
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingCampaign(null);
                setIsCreateModalOpen(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} />
              <span>New Campaign</span>
            </button>
          </div>
        }
      />

      {actionSuccessMsg && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle size={16} />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* QUICK KPI METRICS HEADER */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Active Campaigns
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700 }}>{total}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              backgroundColor: 'rgba(139, 92, 246, 0.12)',
              color: '#8b5cf6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Enrolled Leads
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700 }}>{totalEnrolled.toLocaleString()}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Target size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Demos & Wins
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700 }}>
              {totalDemos} Booked <span style={{ fontSize: '0.85rem', color: '#10b981' }}>({totalWon} Won)</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BarChart2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Avg Conversion Rate
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700 }}>{avgConversion}%</div>
          </div>
        </div>
      </div>

      <Filters
        searchPlaceholder="Search campaign name, audience, industry..."
        searchValue={search}
        onSearchChange={setSearch}
        filterOptions={[
          {
            key: 'product',
            label: 'All Products',
            value: productFilter,
            options: [
              { label: 'HireIQ', value: 'HireIQ' },
              { label: 'HRMS Portal', value: 'HRMS' },
              { label: 'Both', value: 'Both' },
            ],
            onChange: setProductFilter,
          },
          {
            key: 'leadSource',
            label: 'All Lead Sources',
            value: leadSourceFilter,
            options: LEAD_SOURCES.map((s) => ({ label: s, value: s })),
            onChange: setLeadSourceFilter,
          },
          {
            key: 'status',
            label: 'All Statuses',
            value: statusFilter,
            options: [
              { label: 'Active', value: 'Active' },
              { label: 'Draft', value: 'Draft' },
              { label: 'Paused', value: 'Paused' },
              { label: 'Completed', value: 'Completed' },
              { label: 'Archived', value: 'Archived' },
            ],
            onChange: setStatusFilter,
          },
        ]}
      />

      <Table
        columns={columns}
        data={campaigns}
        loading={loading}
        keyExtractor={(row) => row.id}
        emptyTitle="No campaigns found"
        emptyDescription="Create your first B2B outreach campaign or adjust filter parameters."
        pagination={{
          page,
          limit: 10,
          total,
          onPageChange: setPage,
        }}
      />

      {/* CREATE / EDIT MODAL */}
      <CampaignModal
        isOpen={isCreateModalOpen}
        campaign={editingCampaign}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingCampaign(null);
        }}
        onSuccess={(saved) => {
          showSuccess(`Campaign "${saved.name}" ${editingCampaign ? 'updated' : 'created'} successfully`);
          setIsCreateModalOpen(false);
          setEditingCampaign(null);
          loadCampaigns();
        }}
      />

      {/* CAMPAIGN DETAILS & FUNNEL MODAL */}
      <CampaignDetailModal
        isOpen={Boolean(selectedCampaignId)}
        campaignId={selectedCampaignId}
        onClose={() => setSelectedCampaignId(null)}
        onEdit={(camp) => {
          setSelectedCampaignId(null);
          setEditingCampaign(camp);
          setIsCreateModalOpen(true);
        }}
      />

      {/* FREE ATS SCORE CHECK LEAD CAPTURE MODAL */}
      <AtsScoreCaptureModal
        isOpen={isAtsModalOpen}
        onClose={() => setIsAtsModalOpen(false)}
        onSuccess={(_lead, isExisting) => {
          showSuccess(
            `Lead successfully captured! ${
              isExisting ? '(Matched existing contact, duplicate avoided)' : '(New contact & company registered)'
            }`
          );
          setIsAtsModalOpen(false);
          loadCampaigns();
        }}
      />
    </div>
  );
};
export default CampaignsPage;
