import React, { useState, useEffect, useCallback } from 'react';
import { WeeklyTargetSummary } from '../../types';
import { targetService } from '../../api';
import { ConfigureTargetsModal } from './ConfigureTargetsModal';
import { Target, Settings2, CheckCircle2 } from 'lucide-react';

export interface WeeklyTargetsWidgetProps {
  targets?: WeeklyTargetSummary[];
  onRefresh?: () => void;
}

export const WeeklyTargetsWidget: React.FC<WeeklyTargetsWidgetProps> = ({
  targets: propTargets,
  onRefresh,
}) => {
  const [internalTargets, setInternalTargets] = useState<WeeklyTargetSummary[]>([]);
  const [isConfigureOpen, setIsConfigureOpen] = useState(false);

  const loadTargets = useCallback(async () => {
    try {
      const res = await targetService.getWeeklyTargets();
      if (res.data) {
        setInternalTargets(res.data);
      }
    } catch {
      // Handled
    }
  }, []);

  useEffect(() => {
    if (!propTargets) {
      loadTargets();
    }
  }, [propTargets, loadTargets]);

  const targets = propTargets || internalTargets;

  const handleRefresh = () => {
    if (!propTargets) {
      loadTargets();
    }
    onRefresh?.();
  };

  const targetLabels: Record<string, { label: string; icon: string }> = {
    companies: { label: 'New Companies', icon: '🏢' },
    contacts: { label: 'Contacts Found', icon: '👥' },
    outreach: { label: 'Messages & Calls', icon: '📞' },
    replies: { label: 'Prospect Replies', icon: '💬' },
    demos: { label: 'Demos Booked', icon: '📅' },
  };

  return (
    <div
      style={{
        padding: '1.25rem',
        borderRadius: '12px',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      {/* Widget Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              padding: '0.45rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              color: 'var(--primary-400)',
              display: 'flex',
            }}
          >
            <Target size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Weekly Performance Quotas</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Actual live achievement vs configured weekly targets
            </span>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setIsConfigureOpen(true)}
          style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
        >
          <Settings2 size={14} />
          <span>Configure</span>
        </button>
      </div>

      {/* Targets Progress Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
        }}
      >
        {targets.map((t) => {
          const info = targetLabels[t.target_type] || { label: t.target_type, icon: '🎯' };
          const isCompleted = t.achievement_rate >= 100;
          const progressPercent = Math.min(100, Math.max(0, t.achievement_rate));

          let barColor = 'var(--primary-500)';
          if (isCompleted) barColor = 'var(--status-success)';
          else if (t.achievement_rate >= 70) barColor = '#3b82f6';
          else if (t.achievement_rate >= 40) barColor = '#f59e0b';
          else barColor = '#64748b';

          return (
            <div
              key={t.target_type}
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  <span style={{ marginRight: '6px' }}>{info.icon}</span>
                  {info.label}
                </span>
                {isCompleted && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: 'var(--status-success)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <CheckCircle2 size={12} />
                    Done
                  </span>
                )}
              </div>

              {/* Numbers Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {t.actual_value}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                    / {t.target_value}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: barColor }}>
                  {t.achievement_rate}%
                </div>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  height: '7px',
                  width: '100%',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progressPercent}%`,
                    backgroundColor: barColor,
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              {/* Remaining footer */}
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{isCompleted ? 'Goal achieved!' : `${t.remaining} remaining`}</span>
                <span>Target: {t.target_value}</span>
              </div>
            </div>
          );
        })}
      </div>

      <ConfigureTargetsModal
        isOpen={isConfigureOpen}
        targets={targets}
        onClose={() => setIsConfigureOpen(false)}
        onSuccess={handleRefresh}
      />
    </div>
  );
};
