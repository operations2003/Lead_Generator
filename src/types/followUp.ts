import { ActivityType } from './activity';

export type FollowUpStatus = 'Pending' | 'Completed' | 'Cancelled';
export type FollowUpComputedStatus = 'Overdue' | 'Due Today' | 'Upcoming' | 'Completed' | 'Cancelled';

export interface FollowUp {
  id: string;
  lead_id: string;
  activity_id?: string | null;
  user_id: string;
  title: string;
  type: ActivityType;
  due_date: string;
  status: FollowUpStatus;
  notes?: string | null;
  cadence_day?: number | null;
  completed_at?: string | null;
  completed_by?: string | null;
  rescheduled_count: number;
  created_at: string;
  updated_at: string;
  // Relations
  user_name?: string;
  user_email?: string;
  completed_by_name?: string | null;
  lead_title?: string;
  lead_status?: string;
  lead_priority?: string;
  company_name?: string;
  company_id?: string;
  contact_name?: string | null;
  contact_id?: string | null;
  contact_title?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  computed_status?: FollowUpComputedStatus;
}

export interface CreateFollowUpPayload {
  leadId: string;
  activityId?: string;
  title: string;
  type: ActivityType;
  dueDate: string;
  notes?: string;
  cadenceDay?: number;
}

export interface UpdateFollowUpPayload {
  title?: string;
  type?: ActivityType;
  dueDate?: string;
  status?: FollowUpStatus;
  notes?: string;
  cadenceDay?: number;
}

export interface FollowUpSummary {
  overdue: number;
  dueToday: number;
  upcoming: number;
  completed: number;
  total: number;
}

export interface FollowUpFilterParams {
  leadId?: string;
  userId?: string;
  status?: string;
  filter?: 'all' | 'today' | 'upcoming' | 'overdue' | 'completed';
  type?: ActivityType | string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface FollowUpsListResponse {
  items: FollowUp[];
  total: number;
  page: number;
  limit: number;
  summary: FollowUpSummary;
}
