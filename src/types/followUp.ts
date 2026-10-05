export type FollowUpType = 'Call' | 'Email' | 'Meeting' | 'Demo' | 'Task';
export type FollowUpStatus = 'Scheduled' | 'Completed' | 'Overdue' | 'Cancelled';

export interface FollowUp {
  id: string;
  leadId: string;
  leadTitle: string;
  companyName: string;
  contactName: string;
  type: FollowUpType;
  status: FollowUpStatus;
  scheduledAt: string;
  notes?: string;
  outcome?: string;
  assignedTo: string;
  createdAt: string;
}

export interface FollowUpFilterParams {
  type?: FollowUpType;
  status?: FollowUpStatus;
  leadId?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
}
