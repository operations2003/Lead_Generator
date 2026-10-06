export type CampaignStatus = 'Draft' | 'Active' | 'Paused' | 'Completed' | 'Archived';
export type CampaignProduct = 'HireIQ' | 'HRMS' | 'Both' | 'Higher IQ' | 'HRMS Portal';

export interface Campaign {
  id: string;
  name: string;
  product: string;
  targetAudience?: string | null;
  industry?: string | null;
  location?: string | null;
  leadSource?: string | null;
  startDate: string;
  endDate?: string | null;
  status: CampaignStatus;
  assignedUserId?: string | null;
  assignedUserName?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;

  // Live funnel metrics computed from database
  totalLeads: number;
  newLeads: number;
  contacted: number;
  replies: number;
  demosBooked: number;
  demosCompleted: number;
  won: number;
  lost: number;
  followUpsDue: number;
  conversionRate: number;

  // Snake_case aliases for API backward/cross compatibility
  total_leads?: number;
  new_leads?: number;
  demos_booked?: number;
  demos_completed?: number;
  follow_ups_due?: number;
  conversion_rate?: number;
  lead_source?: string | null;
  target_audience?: string | null;

  // Legacy compatibility fields
  type?: string;
  targetIndustry?: string;
  contactedCount?: number;
  responseRate?: number;
}

export interface CampaignPayload {
  name: string;
  product: string;
  targetAudience?: string | null;
  industry?: string | null;
  location?: string | null;
  leadSource?: string | null;
  startDate: string;
  endDate?: string | null;
  status?: CampaignStatus;
  assignedUserId?: string | null;
  notes?: string | null;
}

export interface CampaignFilterParams {
  search?: string;
  status?: CampaignStatus;
  product?: string;
  leadSource?: string;
  industry?: string;
  location?: string;
  assignedUserId?: string;
  startDate?: string;
  endDate?: string;
  type?: string;
  page?: number;
  limit?: number;
}
