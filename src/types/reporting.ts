export type WeeklyTargetType = 'companies' | 'contacts' | 'outreach' | 'replies' | 'demos';

export interface WeeklyTargetSummary {
  id?: string;
  target_type: WeeklyTargetType;
  target_value: number;
  actual_value: number;
  achievement_rate: number;
  remaining: number;
  user_id?: string | null;
  start_date: string;
  end_date: string;
}

export interface SaveWeeklyTargetPayload {
  targetType: WeeklyTargetType;
  targetValue: number;
  userId?: string | null;
  startDate?: string;
  endDate?: string;
}

export interface ReportingSummary {
  companiesAdded: number;
  contactsFound: number;
  leadsCreated: number;
  messagesSent: number;
  callsMade: number;
  totalOutreachTouches: number;
  replies: number;
  demosBooked: number;
  demosCompleted: number;
  won: number;
  lost: number;
  totalClosed: number;
  conversionRate: number;
  overdueFollowUps: number;
  totalPipelineValue: number;
}

export interface LeadBySourceMetric {
  source: string;
  count: number;
  percentage: number;
  wonCount: number;
}

export interface LeadByCampaignMetric {
  campaignId: string;
  campaignName: string;
  product: string;
  totalLeads: number;
  contacted: number;
  replies: number;
  demosBooked: number;
  won: number;
  conversionRate: number;
}

export interface LeadByProductMetric {
  product: string;
  count: number;
  percentage: number;
  pipelineValue: number;
  wonCount: number;
}

export interface ReportingOverview {
  summary: ReportingSummary;
  leadsBySource: LeadBySourceMetric[];
  leadsByCampaign: LeadByCampaignMetric[];
  leadsByProduct: LeadByProductMetric[];
  recentActivityTrends: {
    date: string;
    activities: number;
    leads: number;
  }[];
  filters: {
    startDate: string;
    endDate: string;
    period: string;
  };
}

export interface AtsScoreLeadCapturePayload {
  fullName: string;
  email: string;
  phone?: string | null;
  companyName: string;
  jobTitle?: string | null;
  atsScore?: number | null;
  resumeName?: string | null;
  notes?: string | null;
  campaignId?: string | null;
}
