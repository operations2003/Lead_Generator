import React, { useState, useEffect, useCallback } from 'react';
import {
  PageHeader,
  Table,
  Column,
} from '../components/common';
import {
  Phone,
  Mail,
  Linkedin,
  MessageSquare,
  Presentation,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  RefreshCw,
  Search,
  RotateCw,
  Building2,
  Star,
  Trash2,
  ExternalLink,
  LucideIcon,
} from 'lucide-react';
import { followUpService, leadService } from '../api';
import {
  FollowUp,
  FollowUpFilterParams,
  FollowUpSummary,
  ActivityType,
  Lead,
} from '../types';
import {
  RescheduleFollowUpModal,
  LogActivityModal,
} from '../components/outreach';
import { LeadDetailModal } from '../components/leads/LeadDetailModal';

const ACTIVITY_TYPE_CONFIG: Record<
  ActivityType,
  { label: string; icon: LucideIcon; color: string; bg: string; border: string }
> = {
  Email: { label: 'Email', icon: Mail, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)' },
  LinkedIn: { label: 'LinkedIn', icon: Linkedin, color: '#0077b5', bg: 'rgba(0, 119, 181, 0.12)', border: 'rgba(0, 119, 181, 0.3)' },
  Phone: { label: 'Phone', icon: Phone, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' },
  WhatsApp: { label: 'WhatsApp', icon: MessageSquare, color: '#25d366', bg: 'rgba(37, 211, 102, 0.12)', border: 'rgba(37, 211, 102, 0.3)' },
  Demo: { label: 'Demo', icon: Presentation, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.3)' },
  Other: { label: 'Other', icon: FileText, color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)', border: 'rgba(100, 116, 139, 0.3)' },
};

export const FollowUpsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);

  // Filters
  const [activeTab, setActiveTab] = useState<'all' | 'overdue' | 'today' | 'upcoming' | 'completed'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Summary counts
  const [summary, setSummary] = useState<FollowUpSummary>({
    overdue: 0,
    dueToday: 0,
    upcoming: 0,
    completed: 0,
    total: 0,
  });

  // Modals state
  const [rescheduleTarget, setRescheduleTarget] = useState<FollowUp | null>(null);
  const [logActivityTarget, setLogActivityTarget] = useState<FollowUp | null>(null);
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);

  const loadFollowUps = useCallback(async () => {
    setLoading(true);
    try {
      const params: FollowUpFilterParams = {
        page,
        limit: pageSize,
        filter: activeTab,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        search: search.trim() || undefined,
      };

      const res = await followUpService.getFollowUps(params);
      if (res.data) {
        setFollowUps(res.data.items || []);
        setTotal(res.data.total || 0);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (err) {
      console.error('Failed to load follow-ups:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, activeTab, typeFilter, search]);

  useEffect(() => {
    loadFollowUps();
  }, [loadFollowUps]);

  // Handle 1-click complete
  const handleComplete = async (item: FollowUp) => {
    try {
      await followUpService.completeFollowUp(item.id, 'Task marked as completed.');
      loadFollowUps();
    } catch (err) {
      console.error('Failed to complete follow-up:', err);
    }
  };

  // Handle delete
  const handleDelete = async (item: FollowUp) => {
    if (window.confirm(`Are you sure you want to remove the follow-up task: "${item.title}"?`)) {
      try {
        await followUpService.deleteFollowUp(item.id);
        loadFollowUps();
      } catch (err) {
        console.error('Failed to delete follow-up:', err);
      }
    }
  };

  // Open lead modal
  const handleViewLead = async (leadId: string) => {
    try {
      const res = await leadService.getLeadById(leadId);
      if (res.data) {
        setSelectedLeadForDetail(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch lead details:', err);
    }
  };

  const columns: Column<FollowUp>[] = [
    {
      key: 'due_date',
      header: 'Due Date & Status',
      sortable: true,
      render: (row) => {
        const compStatus = row.computed_status || 'Upcoming';
        const isOverdue = compStatus === 'Overdue';
        const isToday = compStatus === 'Due Today';
        const isCompleted = compStatus === 'Completed';

        let badgeBg = 'rgba(59, 130, 246, 0.12)';
        let badgeColor = '#3b82f6';
        let badgeBorder = 'rgba(59, 130, 246, 0.3)';

        if (isOverdue) {
          badgeBg = 'rgba(239, 68, 68, 0.16)';
          badgeColor = '#ef4444';
          badgeBorder = 'rgba(239, 68, 68, 0.45)';
        } else if (isToday) {
          badgeBg = 'rgba(245, 158, 11, 0.16)';
          badgeColor = '#f59e0b';
          badgeBorder = 'rgba(245, 158, 11, 0.45)';
        } else if (isCompleted) {
          badgeBg = 'rgba(16, 185, 129, 0.16)';
          badgeColor = '#10b981';
          badgeBorder = 'rgba(16, 185, 129, 0.4)';
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: badgeBg,
                  color: badgeColor,
                  border: `1px solid ${badgeBorder}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  textTransform: 'uppercase',
                }}
              >
                {isOverdue && <AlertTriangle size={11} />}
                {isToday && <Clock size={11} />}
                {isCompleted && <CheckCircle2 size={11} />}
                {compStatus}
              </span>

              {row.cadence_day && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 5px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(245, 158, 11, 0.12)',
                    color: '#f59e0b',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                  }}
                >
                  Day {row.cadence_day}
                </span>
              )}
            </div>

            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: isOverdue ? '#ef4444' : 'var(--text-primary)' }}>
              {row.due_date ? row.due_date.split('T')[0] : 'No date'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'title',
      header: 'Task & Channel',
      render: (row) => {
        const cfg = ACTIVITY_TYPE_CONFIG[row.type] || ACTIVITY_TYPE_CONFIG.Other;
        const Icon = cfg.icon;

        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '3px',
                  backgroundColor: cfg.bg,
                  color: cfg.color,
                  border: `1px solid ${cfg.border}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <Icon size={10} color={cfg.color} />
                <span>{cfg.label}</span>
              </span>

              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                {row.title}
              </span>
            </div>

            {row.notes && (
              <div style={{ fontSize: '0.78125rem', color: 'var(--text-muted)', lineHeight: '1.35', maxWidth: '380px' }}>
                {row.notes}
              </div>
            )}

            {row.rescheduled_count > 0 && (
              <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <RotateCw size={10} />
                <span>Rescheduled {row.rescheduled_count}x</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'lead_title',
      header: 'Opportunity & Account',
      render: (row) => (
        <div>
          <div
            style={{ fontWeight: 700, cursor: 'pointer', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            onClick={() => handleViewLead(row.lead_id)}
            title="View Lead Details"
          >
            <span>{row.lead_title}</span>
            <ExternalLink size={12} color="var(--primary-color, #3b82f6)" />
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <Building2 size={12} />
            <span>{row.company_name}</span>
            {row.lead_status && (
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.06))',
                  border: '1px solid var(--border-color)',
                }}
              >
                {row.lead_status}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'contact_name',
      header: 'Primary Contact',
      render: (row) => (
        <div>
          {row.contact_name ? (
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Star size={11} fill="#f59e0b" color="#f59e0b" />
                <span>{row.contact_name}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {row.contact_title || 'Decision Maker'}
              </div>
              {row.contact_email && (
                <div style={{ fontSize: '0.72rem', color: 'var(--primary-color, #3b82f6)' }}>
                  {row.contact_email}
                </div>
              )}
            </div>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No contact attached</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
          {row.status === 'Pending' && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '3px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px' }}
              onClick={() => handleComplete(row)}
              title="Mark Completed"
            >
              <CheckCircle2 size={12} />
              <span>Complete</span>
            </button>
          )}

          {row.status === 'Pending' && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '3px 7px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px' }}
              onClick={() => setRescheduleTarget(row)}
              title="Reschedule"
            >
              <RotateCw size={11} />
              <span>Reschedule</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '3px 7px', fontSize: '0.72rem' }}
            onClick={() => setLogActivityTarget(row)}
            title="Log Touchpoint"
          >
            Log Touch
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '3px 6px', color: '#ef4444' }}
            onClick={() => handleDelete(row)}
            title="Remove"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Outreach Follow-Ups & Tasks"
        description="Execute 15-day cadence touches: Day 1 email, Day 3 LinkedIn, Day 6 call, Day 10 email, Day 15 final follow-up."
        breadcrumbs={[{ label: 'Home' }, { label: 'Follow-ups', active: true }]}
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => loadFollowUps()}
              title="Refresh"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        }
      />

      {/* METRIC SUMMARY CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Overdue Card */}
        <div
          onClick={() => {
            setActiveTab('overdue');
            setPage(1);
          }}
          style={{
            cursor: 'pointer',
            padding: '1.125rem',
            backgroundColor: activeTab === 'overdue' ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-card)',
            border: activeTab === 'overdue' ? '2px solid #ef4444' : '1px solid var(--border-color)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: summary.overdue > 0 ? '0 0 12px rgba(239, 68, 68, 0.15)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <div
            style={{
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#ef4444', textTransform: 'uppercase', fontWeight: 800 }}>
              Overdue Tasks
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#ef4444' }}>
              {summary.overdue}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Requires immediate action
            </div>
          </div>
        </div>

        {/* Due Today Card */}
        <div
          onClick={() => {
            setActiveTab('today');
            setPage(1);
          }}
          style={{
            cursor: 'pointer',
            padding: '1.125rem',
            backgroundColor: activeTab === 'today' ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-card)',
            border: activeTab === 'today' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.15s ease',
          }}
        >
          <div
            style={{
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
            }}
          >
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#f59e0b', textTransform: 'uppercase', fontWeight: 800 }}>
              Due Today
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#f59e0b' }}>
              {summary.dueToday}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Scheduled for today
            </div>
          </div>
        </div>

        {/* Upcoming Card */}
        <div
          onClick={() => {
            setActiveTab('upcoming');
            setPage(1);
          }}
          style={{
            cursor: 'pointer',
            padding: '1.125rem',
            backgroundColor: activeTab === 'upcoming' ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-card)',
            border: activeTab === 'upcoming' ? '2px solid #3b82f6' : '1px solid var(--border-color)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.15s ease',
          }}
        >
          <div
            style={{
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: '#3b82f6',
            }}
          >
            <Calendar size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#3b82f6', textTransform: 'uppercase', fontWeight: 800 }}>
              Upcoming Touches
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#3b82f6' }}>
              {summary.upcoming}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Next cadence steps
            </div>
          </div>
        </div>

        {/* Completed Card */}
        <div
          onClick={() => {
            setActiveTab('completed');
            setPage(1);
          }}
          style={{
            cursor: 'pointer',
            padding: '1.125rem',
            backgroundColor: activeTab === 'completed' ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-card)',
            border: activeTab === 'completed' ? '2px solid #10b981' : '1px solid var(--border-color)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.15s ease',
          }}
        >
          <div
            style={{
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 800 }}>
              Completed Touches
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#10b981' }}>
              {summary.completed}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Successfully executed
            </div>
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS & TABS */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          padding: '1rem',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
        }}
      >
        {/* Segmented Filter Tabs */}
        <div
          style={{
            display: 'inline-flex',
            backgroundColor: 'var(--bg-subtle, rgba(255, 255, 255, 0.04))',
            borderRadius: '8px',
            padding: '3px',
            border: '1px solid var(--border-color)',
            gap: '2px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('all');
              setPage(1);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: 600,
              backgroundColor: activeTab === 'all' ? 'var(--primary-color, #3b82f6)' : 'transparent',
              color: activeTab === 'all' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.15s ease',
            }}
          >
            All Tasks ({summary.total})
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('overdue');
              setPage(1);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: 700,
              backgroundColor: activeTab === 'overdue' ? '#ef4444' : 'transparent',
              color: activeTab === 'overdue' ? '#fff' : '#ef4444',
              transition: 'all 0.15s ease',
            }}
          >
            <AlertTriangle size={13} />
            <span>Overdue ({summary.overdue})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('today');
              setPage(1);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: 600,
              backgroundColor: activeTab === 'today' ? '#f59e0b' : 'transparent',
              color: activeTab === 'today' ? '#fff' : '#f59e0b',
              transition: 'all 0.15s ease',
            }}
          >
            <Clock size={13} />
            <span>Due Today ({summary.dueToday})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('upcoming');
              setPage(1);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: 600,
              backgroundColor: activeTab === 'upcoming' ? '#3b82f6' : 'transparent',
              color: activeTab === 'upcoming' ? '#fff' : '#3b82f6',
              transition: 'all 0.15s ease',
            }}
          >
            <Calendar size={13} />
            <span>Upcoming ({summary.upcoming})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('completed');
              setPage(1);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: 600,
              backgroundColor: activeTab === 'completed' ? '#10b981' : 'transparent',
              color: activeTab === 'completed' ? '#fff' : '#10b981',
              transition: 'all 0.15s ease',
            }}
          >
            <CheckCircle2 size={13} />
            <span>Completed ({summary.completed})</span>
          </button>
        </div>

        {/* Right filters: Search and Channel select */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '220px' }}>
            <Search size={15} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search tasks, accounts..."
              style={{ width: '100%' }}
            />
          </div>

          <select
            className="input"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: '140px' }}
          >
            <option value="all">All Channels</option>
            <option value="Email">Email</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="Phone">Phone</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Demo">Demo</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <Table
        columns={columns}
        data={followUps}
        loading={loading}
        keyExtractor={(row) => row.id}
        pagination={{
          page,
          limit: pageSize,
          total,
          onPageChange: (newPage) => setPage(newPage),
        }}
        emptyTitle="No Follow-Up Tasks Found"
        emptyDescription="All outreach tasks in this view are completed or none scheduled yet."
      />

      {/* MODAL: RESCHEDULE */}
      <RescheduleFollowUpModal
        isOpen={Boolean(rescheduleTarget)}
        followUp={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onSuccess={() => loadFollowUps()}
      />

      {/* MODAL: LOG ACTIVITY */}
      {logActivityTarget && (
        <LogActivityModal
          isOpen={Boolean(logActivityTarget)}
          leadId={logActivityTarget.lead_id}
          leadTitle={logActivityTarget.lead_title}
          companyName={logActivityTarget.company_name}
          contactName={logActivityTarget.contact_name || undefined}
          onClose={() => setLogActivityTarget(null)}
          onSuccess={() => loadFollowUps()}
        />
      )}

      {/* MODAL: LEAD DETAILS */}
      <LeadDetailModal
        isOpen={Boolean(selectedLeadForDetail)}
        lead={selectedLeadForDetail}
        onClose={() => setSelectedLeadForDetail(null)}
      />
    </div>
  );
};
