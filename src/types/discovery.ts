import { LeadFilterParams, Lead } from './lead';

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

export interface DiscoveryOptions {
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

export interface LeadDiscoveryFilterParams extends LeadFilterParams {
  existingTools?: string;
  existingTool?: string;
  signals?: string;
  hiringSignals?: string;
  leadSignals?: string;
  hiringVolume?: string;
  followUpStatus?: string;
  industry?: string;
  location?: string;
  employeeSize?: string;
  productFit?: string;
  jobTitle?: string;
  decisionMaker?: boolean | string;
  company?: string;
  productRelevance?: string;
  campaign?: string;
}

export interface DiscoverySearchResult {
  items: Lead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type DiscoveryJobStatus =
  | 'pending'
  | 'discovering'
  | 'enriching'
  | 'completed'
  | 'failed'
  | 'partial';

export type ExtractionStatus =
  | 'pending'
  | 'completed'
  | 'no_contacts'
  | 'website_unavailable'
  | 'failed';

export type ContactVerificationStatus = 'found' | 'syntax_valid' | 'verified';

export interface DiscoveredContactEmail {
  email: string;
  type: string;
  status: ContactVerificationStatus;
  sourceUrl: string;
}

export interface DiscoveredContactPhone {
  phone: string;
  type: string;
  status: ContactVerificationStatus;
  sourceUrl: string;
}

export interface DiscoveryJob {
  id: string;
  category: string;
  location: string;
  max_results: number;
  status: DiscoveryJobStatus;
  progress_percent: number;
  progress_message: string | null;
  discovered_count: number;
  enriched_count: number;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiscoveredLead {
  id: string;
  job_id: string;
  company_name: string;
  normalized_name: string;
  category: string;
  location: string;
  website: string;
  domain: string;
  emails: string | null; // serialized JSON or parsed
  phones: string | null; // serialized JSON or parsed
  address: string | null;
  address_source_url: string | null;
  source_urls: string | null; // serialized JSON or parsed
  extraction_status: ExtractionStatus;
  extraction_error: string | null;
  saved_to_crm: number;
  saved_company_id: string | null;
  saved_lead_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutoDiscoveryPayload {
  category: string;
  location: string;
  maxResults?: number;
  autoSave?: boolean;
}

