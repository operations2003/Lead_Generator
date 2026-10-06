import React, { useState, useEffect, useCallback } from 'react';
import { Activity, ActivityType } from '../../types';
import { activityService } from '../../api';
import { LogActivityModal } from './LogActivityModal';
import {
  Mail,
  Linkedin,
  Phone,
  MessageSquare,
  Presentation,
  FileText,
  Plus,
  Clock,
  Sparkles,
  User,
  Loader2,
  LucideIcon,
} from 'lucide-react';

export interface LeadActivityTimelineProps {
  leadId: string;
  leadTitle: string;
  companyName: string;
  contactName?: string;
  onActivityChanged?: () => void;
}

const TYPE_CONFIG: Record<
  ActivityType,
  { label: string; icon: LucideIcon; color: string; bg: string; border: string }
> = {
  Email: {
    label: 'Email',
    icon: Mail,
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.3)',
  },
  LinkedIn: {
    label: 'LinkedIn',
    icon: Linkedin,
    color: '#0077b5',
    bg: 'rgba(0, 119, 181, 0.12)',
    border: 'rgba(0, 119, 181, 0.3)',
  },
  Phone: {
    label: 'Phone Call',
    icon: Phone,
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.3)',
  },
  WhatsApp: {
    label: 'WhatsApp',
    icon: MessageSquare,
    color: '#25d366',
    bg: 'rgba(37, 211, 102, 0.12)',
    border: 'rgba(37, 211, 102, 0.3)',
  },
  Demo: {
    label: 'Demo / Pitch',
    icon: Presentation,
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.12)',
    border: 'rgba(139, 92, 246, 0.3)',
  },
  Other: {
    label: 'Other',
    icon: FileText,
    color: '#64748b',
    bg: 'rgba(100, 116, 139, 0.12)',
    border: 'rgba(100, 116, 139, 0.3)',
  },
};

export const LeadActivityTimeline: React.FC<LeadActivityTimelineProps> = ({
  leadId,
  leadTitle,
  companyName,
  contactName,
  onActivityChanged,
}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  const loadActivities = useCallback(async () => {
    try {
      setLoading(true);
      const res = await activityService.getActivitiesByLead(leadId);
      if (res.data) {
        setActivities(res.data);
      }
    } catch (err) {
      console.error('Failed to load lead activities:', err);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const handleActivityLogged = () => {
    loadActivities();
    onActivityChanged?.();
  };

  const formatActivityDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Outreach Cadence & Activity Timeline
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            15-Day Cadence tracking: Day 1 email, Day 3 LinkedIn, Day 6 call, Day 10 email, Day 15 final follow-up.
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          style={{ padding: '6px 12px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => setIsLogModalOpen(true)}
        >
          <Plus size={15} />
          <span>Log Activity</span>
        </button>
      </div>

      {/* Timeline container */}
      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 size={24} className="spin" style={{ margin: '0 auto 8px auto' }} />
          <div>Loading outreach history...</div>
        </div>
      ) : activities.length === 0 ? (
        <div
          style={{
            padding: '2.5rem 1rem',
            textAlign: 'center',
            backgroundColor: 'var(--bg-subtle, rgba(255, 255, 255, 0.02))',
            border: '1px dashed var(--border-color)',
            borderRadius: '10px',
          }}
        >
          <Sparkles size={28} style={{ color: '#f59e0b', margin: '0 auto 8px auto', opacity: 0.8 }} />
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>
            No Outreach Logged Yet
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 12px auto' }}>
            Initiate the 15-day cadence sequence by logging your initial Day 1 value pitch email or contact touchpoint.
          </div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem' }}
            onClick={() => setIsLogModalOpen(true)}
          >
            <Plus size={14} />
            <span>Start Cadence (Day 1 Pitch)</span>
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Vertical timeline trace line */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              bottom: '12px',
              left: '11px',
              width: '2px',
              backgroundColor: 'var(--border-color)',
              zIndex: 1,
            }}
          />

          {activities.map((act) => {
            const cfg = TYPE_CONFIG[act.type] || TYPE_CONFIG.Other;
            const Icon = cfg.icon;

            return (
              <div key={act.id} style={{ position: 'relative', zIndex: 2 }}>
                {/* Timeline node icon */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-24px',
                    top: '2px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--bg-card)',
                    border: `2px solid ${cfg.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 6px rgba(0,0,0,0.1)',
                  }}
                >
                  <Icon size={12} color={cfg.color} />
                </div>

                {/* Content Card */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  {/* Card top row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: cfg.bg,
                          color: cfg.color,
                          border: `1px solid ${cfg.border}`,
                        }}
                      >
                        {cfg.label}
                      </span>

                      {act.cadence_day && (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(245, 158, 11, 0.15)',
                            color: '#f59e0b',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                          }}
                        >
                          Cadence Day {act.cadence_day}
                        </span>
                      )}

                      {act.subject && (
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                          {act.subject}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      <span>{formatActivityDate(act.activity_date)}</span>
                    </div>
                  </div>

                  {/* Notes content */}
                  <div
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.45',
                      whiteSpace: 'pre-wrap',
                      marginBottom: '6px',
                    }}
                  >
                    {act.notes}
                  </div>

                  {/* Footer metadata */}
                  {act.user_name && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={11} />
                      <span>Logged by {act.user_name}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Log Activity Modal */}
      <LogActivityModal
        isOpen={isLogModalOpen}
        leadId={leadId}
        leadTitle={leadTitle}
        companyName={companyName}
        contactName={contactName}
        onClose={() => setIsLogModalOpen(false)}
        onSuccess={handleActivityLogged}
      />
    </div>
  );
};
