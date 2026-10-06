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

export interface LeadRecord {
  id: string;
  company_id: string;
  contact_id: string | null;
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

