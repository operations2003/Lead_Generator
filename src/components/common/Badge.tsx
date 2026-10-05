import React from 'react';
import { LeadPriority } from '../../types';

export interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'purple' | 'neutral';
  showDot?: boolean;
}

const statusVariantMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'purple' | 'neutral'> = {
  // Company / Lead statuses
  'Qualified': 'success',
  'Won': 'success',
  'Active': 'success',
  'Completed': 'success',
  'Prospect': 'info',
  'New': 'info',
  'Contacted': 'purple',
  'Discovery': 'purple',
  'Proposal': 'warning',
  'Negotiation': 'warning',
  'Scheduled': 'info',
  'Pending': 'warning',
  'Unqualified': 'neutral',
  'Lost': 'error',
  'Bounced': 'error',
  'Overdue': 'error',
  'Cancelled': 'neutral',
  'Paused': 'warning',
  'Draft': 'neutral',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant,
  showDot = true,
}) => {
  const badgeVariant = variant || statusVariantMap[status] || 'neutral';

  return (
    <span className={`badge badge-${badgeVariant}`}>
      {showDot && <span className="badge-dot" />}
      <span>{status}</span>
    </span>
  );
};

export interface PriorityBadgeProps {
  priority: LeadPriority;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  let variant: 'neutral' | 'info' | 'warning' | 'error' = 'neutral';
  if (priority === 'Low') variant = 'neutral';
  if (priority === 'Medium') variant = 'info';
  if (priority === 'High') variant = 'warning';
  if (priority === 'Urgent') variant = 'error';

  return (
    <span className={`badge badge-${variant}`}>
      <span>{priority}</span>
    </span>
  );
};
