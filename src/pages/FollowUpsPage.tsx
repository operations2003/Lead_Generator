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
import { Plus, PhoneCall, Mail, Video, CheckSquare } from 'lucide-react';
import { followUpService } from '../api';
import { FollowUp, FollowUpFilterParams, FollowUpType, FollowUpStatus } from '../types';

export const FollowUpsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newActivity, setNewActivity] = useState({
    leadTitle: 'Cloud Migration Pitch',
    companyName: 'Apex Data Inc',
    contactName: 'Sarah Jenkins (VP IT)',
    type: 'Meeting' as FollowUpType,
    scheduledAt: '2026-10-10T14:00',
    notes: 'Present technical architecture deck and cloud pricing breakdown.',
  });

  const loadFollowUps = useCallback(async () => {
    setLoading(true);
    try {
      const params: FollowUpFilterParams = {
        page,
        limit: 10,
        type: (typeFilter as FollowUpType) || undefined,
        status: (statusFilter as FollowUpStatus) || undefined,
      };
      const res = await followUpService.getFollowUps(params);
      if (res.data) {
        setFollowUps(res.data.items || []);
        setTotal(res.data.total || 0);
      }
    } catch {
      // Interface ready
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, statusFilter]);

  useEffect(() => {
    loadFollowUps();
  }, [loadFollowUps]);

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await followUpService.createFollowUp({
        leadId: 'lead-1',
        leadTitle: newActivity.leadTitle,
        companyName: newActivity.companyName,
        contactName: newActivity.contactName,
        type: newActivity.type,
        status: 'Scheduled',
        scheduledAt: newActivity.scheduledAt,
        notes: newActivity.notes,
        assignedTo: 'Sakshi K.',
      });
      setIsModalOpen(false);
      loadFollowUps();
    } catch {
      // Ready for API endpoint
    }
  };

  const getActivityIcon = (type: FollowUpType) => {
    switch (type) {
      case 'Call': return <PhoneCall size={16} />;
      case 'Email': return <Mail size={16} />;
      case 'Meeting':
      case 'Demo': return <Video size={16} />;
      default: return <CheckSquare size={16} />;
    }
  };

  const columns: Column<FollowUp>[] = [
    {
      key: 'type',
      header: 'Activity Type',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          <div style={{ color: 'var(--primary-400)' }}>{getActivityIcon(row.type)}</div>
          <span>{row.type}</span>
        </div>
      ),
    },
    {
      key: 'leadTitle',
      header: 'Opportunity / Account',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.leadTitle}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.companyName} • {row.contactName}</div>
        </div>
      ),
    },
    { key: 'scheduledAt', header: 'Scheduled Time', sortable: true },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    { key: 'notes', header: 'Activity Notes' },
  ];

  return (
    <div>
      <PageHeader
        title="Follow-ups & Sales Tasks"
        description="Schedule, track, and complete outreach touchpoints, technical demos, and discovery calls."
        breadcrumbs={[{ label: 'Home' }, { label: 'Follow-ups', active: true }]}
        actions={
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} />
            <span>Schedule Activity</span>
          </button>
        }
      />

      <Filters
        searchPlaceholder="Filter activities..."
        filterOptions={[
          {
            key: 'type',
            label: 'All Activity Types',
            value: typeFilter,
            options: [
              { label: 'Discovery Call', value: 'Call' },
              { label: 'Email Follow-up', value: 'Email' },
              { label: 'Technical Demo', value: 'Demo' },
              { label: 'Executive Meeting', value: 'Meeting' },
            ],
            onChange: setTypeFilter,
          },
          {
            key: 'status',
            label: 'All Activity Statuses',
            value: statusFilter,
            options: [
              { label: 'Scheduled', value: 'Scheduled' },
              { label: 'Completed', value: 'Completed' },
              { label: 'Overdue', value: 'Overdue' },
            ],
            onChange: setStatusFilter,
          },
        ]}
      />

      <Table
        columns={columns}
        data={followUps}
        loading={loading}
        keyExtractor={(row) => row.id}
        emptyTitle="No scheduled follow-ups"
        emptyDescription="Schedule a call or demo task for an active target account."
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
        title="Schedule Follow-up Task"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleCreateActivity}>
              Confirm Activity
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateActivity} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <FormField label="Activity Type">
            <SelectInput
              value={newActivity.type}
              onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value as FollowUpType })}
              options={[
                { label: 'Executive Meeting', value: 'Meeting' },
                { label: 'Technical Architecture Demo', value: 'Demo' },
                { label: 'Phone Call', value: 'Call' },
                { label: 'Email Outreach', value: 'Email' },
              ]}
            />
          </FormField>
          <FormField label="Opportunity Title" required>
            <TextInput
              value={newActivity.leadTitle}
              onChange={(e) => setNewActivity({ ...newActivity, leadTitle: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Company & Contact">
            <TextInput
              value={newActivity.contactName}
              onChange={(e) => setNewActivity({ ...newActivity, contactName: e.target.value })}
            />
          </FormField>
          <FormField label="Scheduled Date & Time" required>
            <TextInput
              type="datetime-local"
              value={newActivity.scheduledAt}
              onChange={(e) => setNewActivity({ ...newActivity, scheduledAt: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Activity Objective / Notes">
            <TextInput
              value={newActivity.notes}
              onChange={(e) => setNewActivity({ ...newActivity, notes: e.target.value })}
            />
          </FormField>
        </form>
      </Modal>
    </div>
  );
};
