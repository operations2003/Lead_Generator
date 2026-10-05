export type LeadStatus = 'New' | 'Discovery' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
export type LeadPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface Lead {
  id: string;
  companyId: string;
  companyName: string;
  primaryContactId: string;
  primaryContactName: string;
  title: string;
  estimatedValue: number;
  currency: string;
  status: LeadStatus;
  priority: LeadPriority;
  score: number;
  source: 'Inbound' | 'Outreach' | 'Partner' | 'Referral';
  assignedTo: string;
  expectedCloseDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadFilterParams {
  search?: string;
  status?: LeadStatus;
  priority?: LeadPriority;
  assignedTo?: string;
  page?: number;
  limit?: number;
}
