import React, { useState, useEffect, useCallback } from 'react';
import {
  PageHeader,
  Table,
  Filters,
  StatusBadge,
  Modal,
  FormField,
  TextInput,
  SelectInput,
  Column,
} from '../components/common';
import { Plus, BarChart2 } from 'lucide-react';
import { campaignService } from '../api';
import { Campaign, CampaignFilterParams, CampaignType, CampaignStatus } from '../types';

export const CampaignsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newCampaign, setNewCampaign] = useState({
    name: 'Q4 Enterprise Cloud Infrastructure Drive',
    type: 'Email Sequence' as CampaignType,
    targetIndustry: 'FinTech & Banking',
    totalLeads: 500,
  });

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const params: CampaignFilterParams = {
        page,
        limit: 10,
        search: search || undefined,
        status: (statusFilter as CampaignStatus) || undefined,
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
  }, [page, search, statusFilter]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await campaignService.createCampaign({
        name: newCampaign.name,
        type: newCampaign.type,
        status: 'Active',
        targetIndustry: newCampaign.targetIndustry,
        totalLeads: Number(newCampaign.totalLeads),
        contactedCount: 0,
        responseRate: 0,
        conversionRate: 0,
        startDate: '2026-10-01',
      });
      setIsModalOpen(false);
      loadCampaigns();
    } catch {
      // Interface ready
    }
  };

  const columns: Column<Campaign>[] = [
    {
      key: 'name',
      header: 'Campaign Name',
      sortable: true,
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target: {row.targetIndustry}</div>
        </div>
      ),
    },
    { key: 'type', header: 'Outreach Type' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'totalLeads',
      header: 'Audience Size',
      render: (row) => <span>{row.totalLeads?.toLocaleString()} Contacts</span>,
    },
    {
      key: 'responseRate',
      header: 'Response Rate',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, color: 'var(--status-info-text)' }}>
          <BarChart2 size={14} />
          <span>{row.responseRate}%</span>
        </div>
      ),
    },
    {
      key: 'conversionRate',
      header: 'Lead Conv. Rate',
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--status-success-text)' }}>
          {row.conversionRate}%
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Outreach Campaigns & Sequences"
        description="Automate cold email sequences, LinkedIn messaging campaigns, and partner drives."
        breadcrumbs={[{ label: 'Home' }, { label: 'Campaigns', active: true }]}
        actions={
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} />
            <span>New Campaign</span>
          </button>
        }
      />

      <Filters
        searchPlaceholder="Search campaign name..."
        searchValue={search}
        onSearchChange={setSearch}
        filterOptions={[
          {
            key: 'status',
            label: 'All Campaign Statuses',
            value: statusFilter,
            options: [
              { label: 'Active', value: 'Active' },
              { label: 'Draft', value: 'Draft' },
              { label: 'Paused', value: 'Paused' },
              { label: 'Completed', value: 'Completed' },
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
        emptyTitle="No campaigns launched"
        emptyDescription="Create your first B2B outreach campaign sequence."
        pagination={{
          page,
          limit: 10,
          total,
          onPageChange: setPage,
        }}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Outreach Campaign"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleCreateCampaign}>
              Launch Campaign
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <FormField label="Campaign Title" required>
            <TextInput
              value={newCampaign.name}
              onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Outreach Type">
            <SelectInput
              value={newCampaign.type}
              onChange={(e) => setNewCampaign({ ...newCampaign, type: e.target.value as CampaignType })}
              options={[
                { label: 'Email Sequence', value: 'Email Sequence' },
                { label: 'LinkedIn Outreach', value: 'LinkedIn Outreach' },
                { label: 'Cold Call Drive', value: 'Cold Call Drive' },
                { label: 'Webinar Invite', value: 'Webinar' },
              ]}
            />
          </FormField>
          <FormField label="Target Industry Segment">
            <TextInput
              value={newCampaign.targetIndustry}
              onChange={(e) => setNewCampaign({ ...newCampaign, targetIndustry: e.target.value })}
            />
          </FormField>
          <FormField label="Target Lead Audience Size">
            <TextInput
              type="number"
              value={newCampaign.totalLeads}
              onChange={(e) => setNewCampaign({ ...newCampaign, totalLeads: Number(e.target.value) })}
            />
          </FormField>
        </form>
      </Modal>
    </div>
  );
};
