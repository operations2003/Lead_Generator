import React, { useState, useEffect, useCallback } from 'react';
import {
  PageHeader,
  Table,
  Filters,
  StatusBadge,
  PriorityBadge,
  Modal,
  FormField,
  TextInput,
  SelectInput,
  Column,
} from '../components/common';
import { Plus, DollarSign } from 'lucide-react';
import { leadService } from '../api';
import { Lead, LeadFilterParams, LeadPriority, LeadStatus } from '../types';

export const LeadsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newLead, setNewLead] = useState({
    title: 'Cloud Infrastructure Optimization',
    companyName: 'Acme Cloud Inc.',
    estimatedValue: 120000,
    status: 'New' as LeadStatus,
    priority: 'High' as LeadPriority,
  });

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params: LeadFilterParams = {
        page,
        limit: 10,
        search: search || undefined,
        status: (statusFilter as LeadStatus) || undefined,
        priority: (priorityFilter as LeadPriority) || undefined,
      };
      const res = await leadService.getLeads(params);
      if (res.data) {
        setLeads(res.data.items || []);
        setTotal(res.data.total || 0);
      }
    } catch {
      // Interface ready
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, priorityFilter]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await leadService.createLead({
        companyId: 'comp-1',
        companyName: newLead.companyName,
        primaryContactId: 'contact-1',
        primaryContactName: 'Alex Mercer',
        title: newLead.title,
        estimatedValue: Number(newLead.estimatedValue),
        currency: 'USD',
        status: newLead.status,
        priority: newLead.priority,
        score: 85,
        source: 'Outreach',
        assignedTo: 'Sakshi K.',
        expectedCloseDate: '2026-11-30',
      });
      setIsModalOpen(false);
      loadLeads();
    } catch {
      // Service contract ready
    }
  };

  const columns: Column<Lead>[] = [
    {
      key: 'title',
      header: 'Opportunity Title',
      sortable: true,
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.title}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.companyName}</div>
        </div>
      ),
    },
    {
      key: 'estimatedValue',
      header: 'Est. Deal Value',
      sortable: true,
      render: (row) => (
        <div style={{ fontWeight: 600, color: 'var(--status-success-text)' }}>
          ${row.estimatedValue?.toLocaleString()} {row.currency}
        </div>
      ),
    },
    {
      key: 'score',
      header: 'AI Lead Score',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div style={{ fontWeight: 700, color: row.score >= 80 ? 'var(--status-success-text)' : 'var(--text-primary)' }}>
            {row.score}/100
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Pipeline Stage',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row) => <PriorityBadge priority={row.priority} />,
    },
    { key: 'assignedTo', header: 'Owner' },
  ];

  return (
    <div>
      <PageHeader
        title="Qualified Sales Leads & Pipeline"
        description="Track active IT sales opportunities, score potential value, and manage conversion stages."
        breadcrumbs={[{ label: 'Home' }, { label: 'Leads', active: true }]}
        actions={
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} />
            <span>Create Opportunity</span>
          </button>
        }
      />

      <Filters
        searchPlaceholder="Search lead title, account..."
        searchValue={search}
        onSearchChange={setSearch}
        filterOptions={[
          {
            key: 'status',
            label: 'All Pipeline Stages',
            value: statusFilter,
            options: [
              { label: 'New Opportunity', value: 'New' },
              { label: 'Discovery Phase', value: 'Discovery' },
              { label: 'Proposal Sent', value: 'Proposal' },
              { label: 'Negotiation', value: 'Negotiation' },
              { label: 'Closed Won', value: 'Won' },
            ],
            onChange: setStatusFilter,
          },
          {
            key: 'priority',
            label: 'All Priorities',
            value: priorityFilter,
            options: [
              { label: 'Urgent', value: 'Urgent' },
              { label: 'High', value: 'High' },
              { label: 'Medium', value: 'Medium' },
              { label: 'Low', value: 'Low' },
            ],
            onChange: setPriorityFilter,
          },
        ]}
      />

      <Table
        columns={columns}
        data={leads}
        loading={loading}
        keyExtractor={(row) => row.id}
        emptyTitle="No leads in pipeline"
        emptyDescription="Create a new lead opportunity or adjust your stage filters."
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
        title="Create Lead Opportunity"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleCreateLead}>
              Save Opportunity
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateLead} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <FormField label="Opportunity Title" required>
            <TextInput
              value={newLead.title}
              onChange={(e) => setNewLead({ ...newLead, title: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Target Account Name" required>
            <TextInput
              value={newLead.companyName}
              onChange={(e) => setNewLead({ ...newLead, companyName: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Estimated Contract Value ($ USD)" required>
            <TextInput
              type="number"
              icon={<DollarSign size={16} />}
              value={newLead.estimatedValue}
              onChange={(e) => setNewLead({ ...newLead, estimatedValue: Number(e.target.value) })}
              required
            />
          </FormField>
          <FormField label="Initial Pipeline Stage">
            <SelectInput
              value={newLead.status}
              onChange={(e) => setNewLead({ ...newLead, status: e.target.value as LeadStatus })}
              options={[
                { label: 'New', value: 'New' },
                { label: 'Discovery', value: 'Discovery' },
                { label: 'Proposal', value: 'Proposal' },
                { label: 'Negotiation', value: 'Negotiation' },
              ]}
            />
          </FormField>
          <FormField label="Deal Priority">
            <SelectInput
              value={newLead.priority}
              onChange={(e) => setNewLead({ ...newLead, priority: e.target.value as LeadPriority })}
              options={[
                { label: 'Low', value: 'Low' },
                { label: 'Medium', value: 'Medium' },
                { label: 'High', value: 'High' },
                { label: 'Urgent', value: 'Urgent' },
              ]}
            />
          </FormField>
        </form>
      </Modal>
    </div>
  );
};
