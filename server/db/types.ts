// Database configuration and types
export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  last_login_at: string | null;
  login_count: number;
  password_changed_at: string;
  failed_login_attempts: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoleRecord {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface PermissionRecord {
  id: string;
  name: string;
  description: string;
}

export interface SessionRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  ip_address: string | null;
  user_agent: string | null;
  is_revoked: number;
  created_at: string;
  last_activity_at: string;
}

export interface SafeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  permissions: string[];
  lastLoginAt: string | null;
  createdAt: string;
}

export interface CompanyRecord {
  id: string;
  name: string;
  normalized_name: string;
  website: string;
  normalized_domain: string;
  industry: string;
  location: string;
  employee_size: string;
  employee_count: number;
  hiring_signals: string | null;
  current_tools: string | null;
  product_fit: 'High' | 'Medium' | 'Low';
  lead_relevance_score: number;
  notes: string | null;
  status: 'Prospect' | 'Researching' | 'Contacted' | 'Qualified' | 'Customer' | 'Archived' | 'Unqualified';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactRecord {
  id: string;
  company_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string;
  department: string | null;
  decision_maker: number;
  linkedin_url: string | null;
  notes: string | null;
  status: 'Active' | 'Contacted' | 'Qualified' | 'Unresponsive' | 'Archived';
  created_at: string;
  updated_at: string;
}

export interface ContactWithCompanyRecord extends ContactRecord {
  company_name: string;
  company_website: string;
  company_domain: string;
  company_industry: string;
  company_location: string;
}

export type ProductType = 'Higher IQ' | 'HRMS Portal' | 'Both';
export type LeadPriorityType = 'High' | 'Medium' | 'Low';
export type LeadStageType =
  | 'New'
  | 'Contacted'
  | 'Replied'
  | 'Demo Booked'
  | 'Demo Done'
  | 'Won'
  | 'Lost'
  | 'Archived';

export interface LeadStageHistoryRecord {
  id: string;
  lead_id: string;
  from_stage: LeadStageType | null;
  to_stage: LeadStageType;
  changed_by: string | null;
  notes: string | null;
  lost_reason: string | null;
  created_at: string;
}

export type LeadSourceType =
  | 'LinkedIn'
  | 'Email'
  | 'Phone'
  | 'WhatsApp'
  | 'Website'
  | 'Free ATS Score Check'
  | 'LinkedIn Content'
  | 'Referral'
  | 'Partner'
  | 'Other';

export interface LeadRecord {
  id: string;
  company_id: string;
  contact_id: string | null;
  campaign_id?: string | null;
  product: ProductType;
  title: string;
  value: number;
  status: LeadStageType;
  priority: LeadPriorityType;
  hiring_volume: 'High' | 'Medium' | 'Low' | 'None';
  hiring_multiple_roles: number;
  manual_hr_processes: number;
  existing_tools: string | null;
  company_size: string | null;
  decision_maker_identified: number;
  qualification_score: number;
  qualification_notes: string | null;
  notes: string | null;
  source: string | null;
  referrer_name?: string | null;
  referrer_contact?: string | null;
  partner_name?: string | null;
  referral_notes?: string | null;
  ats_score?: number | null;
  assigned_to: string | null;
  lost_reason: string | null;
  won_at: string | null;
  lost_at: string | null;
  stage_changed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadWithRelationsRecord extends LeadRecord {
  company_name: string;
  company_website: string;
  company_domain: string;
  company_industry: string;
  company_location: string;
  company_employee_size: string;
  company_product_fit: string;
  contact_name: string | null;
  contact_title: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_decision_maker: number | null;
  campaign_name?: string | null;
  company_current_tools?: string | null;
  company_hiring_signals?: string | null;
  computed_follow_up_status?: string | null;
  next_follow_up_due_date?: string | null;
}

export type CampaignStatusType = 'Draft' | 'Active' | 'Paused' | 'Completed' | 'Archived';

export interface CampaignRecord {
  id: string;
  name: string;
  product: string;
  target_audience: string | null;
  industry: string | null;
  location: string | null;
  lead_source: string | null;
  start_date: string;
  end_date: string | null;
  status: CampaignStatusType;
  assigned_user_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignWithMetricsRecord extends CampaignRecord {
  assigned_user_name: string | null;
  created_by_name: string | null;
  total_leads: number;
  new_leads: number;
  contacted: number;
  replies: number;
  demos_booked: number;
  demos_completed: number;
  won: number;
  lost: number;
  follow_ups_due: number;
  conversion_rate: number;
}

export type OutreachTemplateType =
  | 'Initial Email'
  | 'LinkedIn Message'
  | 'Follow-up Email'
  | 'Call Script'
  | 'WhatsApp Message'
  | 'Demo Follow-up'
  | 'Final Follow-up'
  | 'Email'
  | 'LinkedIn'
  | 'Phone'
  | 'WhatsApp'
  | 'Other';

export interface OutreachTemplateRecord {
  id: string;
  name: string;
  type: OutreachTemplateType;
  product: string;
  subject: string | null;
  body: string;
  sequence_day: number | null;
  created_by: string | null;
  updated_by: string | null;
  status: 'Active' | 'Archived';
  created_at: string;
  updated_at: string;
}

export type WeeklyTargetType = 'companies' | 'contacts' | 'outreach' | 'replies' | 'demos';

export interface WeeklyTargetRecord {
  id: string;
  target_type: WeeklyTargetType;
  target_value: number;
  user_id: string | null;
  start_date: string;
  end_date: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyTargetSummary {
  id?: string;
  target_type: WeeklyTargetType;
  target_value: number;
  actual_value: number;
  achievement_rate: number;
  remaining: number;
  user_id: string | null;
  start_date: string;
  end_date: string;
}

export type ActivityType = 'Email' | 'LinkedIn' | 'Phone' | 'WhatsApp' | 'Demo' | 'Other';
export type FollowUpStatusType = 'Pending' | 'Completed' | 'Cancelled';
export type FollowUpComputedStatus = 'Overdue' | 'Due Today' | 'Upcoming' | 'Completed' | 'Cancelled';

export interface ActivityRecord {
  id: string;
  lead_id: string;
  user_id: string;
  type: ActivityType;
  subject: string | null;
  notes: string;
  activity_date: string;
  cadence_day: number | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityWithRelationsRecord extends ActivityRecord {
  user_name: string;
  user_email: string;
  lead_title: string;
  company_name: string;
  contact_name: string | null;
}

export interface FollowUpRecord {
  id: string;
  lead_id: string;
  activity_id: string | null;
  user_id: string;
  title: string;
  type: ActivityType;
  due_date: string;
  status: FollowUpStatusType;
  notes: string | null;
  cadence_day: number | null;
  completed_at: string | null;
  completed_by: string | null;
  rescheduled_count: number;
  created_at: string;
  updated_at: string;
}

export interface FollowUpWithRelationsRecord extends FollowUpRecord {
  user_name: string;
  user_email: string;
  completed_by_name: string | null;
  lead_title: string;
  lead_status: string;
  lead_priority: string;
  company_name: string;
  company_id: string;
  contact_name: string | null;
  contact_id: string | null;
  contact_title: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  computed_status?: FollowUpComputedStatus;
}

// Phase 9: Advanced Lead Discovery & Signals Types
export const HIREIQ_LEAD_SIGNALS = [
  'Bulk hiring',
  'High-volume hiring',
  'Multiple open roles',
  'Resume screening',
  'Shortlisting',
  'ATS',
  'Recruitment agency',
  'Staffing',
  'RPO',
] as const;
export type HireIqSignal = (typeof HIREIQ_LEAD_SIGNALS)[number];

export const HRMS_LEAD_SIGNALS = [
  'Manual attendance',
  'Excel HR processes',
  'Payroll',
  'Leave management',
  'Employee records',
  'HRMS',
  'HR software',
] as const;
export type HrmsSignal = (typeof HRMS_LEAD_SIGNALS)[number];

export const ALL_LEAD_SIGNALS = [...HIREIQ_LEAD_SIGNALS, ...HRMS_LEAD_SIGNALS] as const;
export type LeadSignal = (typeof ALL_LEAD_SIGNALS)[number];

export const EXISTING_TOOLS = [
  'Excel',
  'greytHR',
  'Keka',
  'Zoho People',
  'Darwinbox',
  'Zoho Recruit',
  'Naukri RMS',
  'Workable',
  'Greenhouse',
  'No known tool',
] as const;
export type ExistingTool = (typeof EXISTING_TOOLS)[number];

export const FOLLOW_UP_FILTER_STATUSES = [
  'Pending',
  'Overdue',
  'Today',
  'Upcoming',
  'Completed',
  'None',
] as const;
export type FollowUpFilterStatus = (typeof FOLLOW_UP_FILTER_STATUSES)[number];

export interface DiscoveryOptionsResponse {
  leadSources: string[];
  industries: string[];
  products: string[];
  stages: string[];
  priorities: string[];
  existingTools: string[];
  leadSignals: {
    hireIq: string[];
    hrms: string[];
  };
  employeeSizes: string[];
  productFits: string[];
  followUpStatuses: string[];
}

