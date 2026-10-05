export type CampaignStatus = 'Draft' | 'Active' | 'Paused' | 'Completed';
export type CampaignType = 'Email Sequence' | 'LinkedIn Outreach' | 'Cold Call Drive' | 'Webinar';

export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  targetIndustry: string;
  totalLeads: number;
  contactedCount: number;
  responseRate: number;
  conversionRate: number;
  startDate: string;
  endDate?: string;
  createdAt: string;
}

export interface CampaignFilterParams {
  search?: string;
  status?: CampaignStatus;
  type?: CampaignType;
  page?: number;
  limit?: number;
}
