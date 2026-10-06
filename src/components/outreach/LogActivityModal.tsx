import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import {
  ActivityType,
  CADENCE_STEPS,
  Activity,
  OutreachTemplate,
} from '../../types';
import { activityService } from '../../api';
import { TemplateSelectorModal } from './TemplateSelectorModal';
import {
  Mail,
  Linkedin,
  Phone,
  MessageSquare,
  Presentation,
  FileText,
  Sparkles,
  Loader2,
  AlertCircle,
  PlusCircle,
  LucideIcon,
} from 'lucide-react';

export interface LogActivityModalProps {
  isOpen: boolean;
  leadId: string;
  leadTitle?: string;
  companyName?: string;
  contactName?: string;
  onClose: () => void;
  onSuccess?: (created: Activity) => void;
}

const TYPE_CONFIG: Record<
  ActivityType,
  { label: string; icon: LucideIcon; color: string; bg: string }
> = {
  Email: { label: 'Email', icon: Mail, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
  LinkedIn: { label: 'LinkedIn', icon: Linkedin, color: '#0077b5', bg: 'rgba(0, 119, 181, 0.12)' },
  Phone: { label: 'Phone Call', icon: Phone, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  WhatsApp: { label: 'WhatsApp', icon: MessageSquare, color: '#25d366', bg: 'rgba(37, 211, 102, 0.12)' },
  Demo: { label: 'Demo / Pitch', icon: Presentation, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
  Other: { label: 'Other', icon: FileText, color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)' },
};

export const LogActivityModal: React.FC<LogActivityModalProps> = ({
  isOpen,
  leadId,
  leadTitle,
  companyName,
  contactName,
  onClose,
  onSuccess,
}) => {
  const [type, setType] = useState<ActivityType>('Email');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [cadenceDay, setCadenceDay] = useState<number | undefined>(1);
  const [activityDate, setActivityDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });

  // Schedule follow-up state
  const [scheduleNext, setScheduleNext] = useState(true);
  const [followUpTitle, setFollowUpTitle] = useState('Day 3: LinkedIn Connection & Note');
  const [followUpType, setFollowUpType] = useState<ActivityType>('LinkedIn');
  const [followUpCadenceDay, setFollowUpCadenceDay] = useState<number | undefined>(3);
  const [followUpDueDate, setFollowUpDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2); // default +2 days for Day 1 -> Day 3
    return d.toISOString().split('T')[0];
  });
  const [followUpNotes, setFollowUpNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Quick Cadence preset selector
  const handleSelectCadence = (day: number) => {
    const step = CADENCE_STEPS.find((s) => s.day === day);
    if (!step) return;

    setType(step.type);
    setCadenceDay(step.day);
    setSubject(step.title);
    setNotes(step.description);

    // Auto-predict next cadence step for follow-up
    const nextStepIndex = CADENCE_STEPS.findIndex((s) => s.day === day) + 1;
    if (nextStepIndex < CADENCE_STEPS.length) {
      const nextStep = CADENCE_STEPS[nextStepIndex];
      setScheduleNext(true);
      setFollowUpTitle(nextStep.title);
      setFollowUpType(nextStep.type);
      setFollowUpCadenceDay(nextStep.day);
      setFollowUpNotes(nextStep.description);

      const daysDiff = nextStep.day - step.day;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysDiff);
      setFollowUpDueDate(targetDate.toISOString().split('T')[0]);
    } else {
      setScheduleNext(false);
    }
  };

  const handleApplyTemplate = (tpl: OutreachTemplate) => {
    if (tpl.type === 'Email' || tpl.type === 'Initial Email' || tpl.type === 'Follow-up Email' || tpl.type === 'Final Follow-up') {
      setType('Email');
    } else if (tpl.type === 'LinkedIn' || tpl.type === 'LinkedIn Message') {
      setType('LinkedIn');
    } else if (tpl.type === 'Phone' || tpl.type === 'Call Script') {
      setType('Phone');
    } else if (tpl.type === 'WhatsApp' || tpl.type === 'WhatsApp Message') {
      setType('WhatsApp');
    } else if (tpl.type === 'Demo Follow-up') {
      setType('Demo');
    }

    if (tpl.sequenceDay) {
      setCadenceDay(tpl.sequenceDay);
    }
    if (tpl.subject) {
      setSubject(tpl.subject);
    } else {
      setSubject(tpl.name);
    }
    if (tpl.body) {
      const populated = tpl.body
        .replace(/{{contact_name}}/g, contactName || 'there')
        .replace(/{{company_name}}/g, companyName || 'your company')
        .replace(/{{sender_name}}/g, 'Our Team');
      setNotes(populated);
    }
    setShowTemplateModal(false);
  };

  const handleAddDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setFollowUpDueDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      setError('Activity notes are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await activityService.createActivity({
        leadId,
        type,
        subject: subject.trim() || undefined,
        notes: notes.trim(),
        cadenceDay,
        activityDate: activityDate ? new Date(activityDate).toISOString() : undefined,
        scheduleFollowUp: scheduleNext
          ? {
              title: followUpTitle.trim() || `Follow-up on ${companyName || 'lead'}`,
              type: followUpType,
              dueDate: followUpDueDate,
              notes: followUpNotes.trim() || undefined,
              cadenceDay: followUpCadenceDay,
            }
          : undefined,
      });

      if (res.data) {
        onSuccess?.(res.data);
        onClose();
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string; error?: { message?: string } };
      setError(errObj?.error?.message || errObj?.message || 'Failed to log outreach activity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
      title="Log Outreach & Cadence Activity"
      maxWidth="640px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="submit"
            form="log-activity-form"
            className="btn btn-primary"
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {loading ? <Loader2 size={16} className="spin" /> : <PlusCircle size={16} />}
            <span>{loading ? 'Logging...' : 'Save & Log Activity'}</span>
          </button>
        </div>
      }
    >
      <form id="log-activity-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Context bar */}
        {(leadTitle || companyName) && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-subtle, rgba(255, 255, 255, 0.04))',
              border: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.8125rem',
            }}
          >
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Lead: </span>
              <strong>{leadTitle || 'Selected Opportunity'}</strong>
              {companyName && (
                <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>
                  • Account: <strong>{companyName}</strong>
                </span>
              )}
            </div>
            {contactName && (
              <span style={{ color: 'var(--primary-color, #3b82f6)', fontWeight: 600 }}>
                Contact: {contactName}
              </span>
            )}
          </div>
        )}

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '0.85rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* 15-DAY CADENCE SELECTOR PRESETS */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={15} color="#f59e0b" />
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                15-Day Outreach Cadence:
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowTemplateModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.75rem',
                padding: '4px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                color: '#3b82f6',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <FileText size={13} />
              <span>Browse Outreach Templates</span>
            </button>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {CADENCE_STEPS.map((step) => {
              const isSelected = cadenceDay === step.day;
              return (
                <button
                  key={step.day}
                  type="button"
                  onClick={() => handleSelectCadence(step.day)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    border: isSelected ? '1px solid var(--primary-color, #3b82f6)' : '1px solid var(--border-color)',
                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-subtle, rgba(255,255,255,0.03))',
                    color: isSelected ? 'var(--primary-color, #3b82f6)' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Day {step.day} {step.type}
                </button>
              );
            })}
          </div>
        </div>

        {/* ACTIVITY TYPE SELECTOR */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
            Outreach Channel & Type <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
            {(Object.keys(TYPE_CONFIG) as ActivityType[]).map((t) => {
              const cfg = TYPE_CONFIG[t];
              const Icon = cfg.icon;
              const isSelected = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: isSelected ? `2px solid ${cfg.color}` : '1px solid var(--border-color)',
                    backgroundColor: isSelected ? cfg.bg : 'var(--bg-card)',
                    color: isSelected ? cfg.color : 'var(--text-primary)',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '0.8125rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={16} color={cfg.color} />
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SUBJECT & DATE ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
              Subject / Topic
            </label>
            <input
              type="text"
              className="input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Day 1: Cloud assessment pitch or Call feedback"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
              Date & Time
            </label>
            <input
              type="datetime-local"
              className="input"
              value={activityDate}
              onChange={(e) => setActivityDate(e.target.value)}
            />
          </div>
        </div>

        {/* NOTES TEXTAREA */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
            Activity Details & Prospect Notes <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <textarea
            className="input"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Record what was sent, discussion points, prospect reaction, or objections..."
            required
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* SECTION: SCHEDULE NEXT FOLLOW-UP */}
        <div
          style={{
            padding: '1rem',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-subtle, rgba(255, 255, 255, 0.03))',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: scheduleNext ? '0.75rem' : 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem' }}>
              <input
                type="checkbox"
                checked={scheduleNext}
                onChange={(e) => setScheduleNext(e.target.checked)}
              />
              <span>Schedule Next Cadence Follow-Up Task</span>
            </label>
            {scheduleNext && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Creates task in Follow-Up Queue
              </span>
            )}
          </div>

          {scheduleNext && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Follow-Up Title
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={followUpTitle}
                    onChange={(e) => setFollowUpTitle(e.target.value)}
                    placeholder="e.g. Day 3: LinkedIn Touchpoint"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Channel
                  </label>
                  <select
                    className="input"
                    value={followUpType}
                    onChange={(e) => setFollowUpType(e.target.value as ActivityType)}
                  >
                    {(Object.keys(TYPE_CONFIG) as ActivityType[]).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Due Date
                  </label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                      onClick={() => handleAddDays(1)}
                    >
                      +1d
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                      onClick={() => handleAddDays(2)}
                    >
                      +2d
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                      onClick={() => handleAddDays(3)}
                    >
                      +3d
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                      onClick={() => handleAddDays(5)}
                    >
                      +5d
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                      onClick={() => handleAddDays(7)}
                    >
                      +1wk
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  className="input"
                  value={followUpDueDate}
                  onChange={(e) => setFollowUpDueDate(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Follow-Up Objective / Reminder Note
                </label>
                <input
                  type="text"
                  className="input"
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="e.g. Check if Elena opened email; send connection request"
                />
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>

    <TemplateSelectorModal
      isOpen={showTemplateModal}
      onClose={() => setShowTemplateModal(false)}
      onSelect={handleApplyTemplate}
      currentType={type}
      companyName={companyName}
      contactName={contactName}
    />
    </>
  );
};
