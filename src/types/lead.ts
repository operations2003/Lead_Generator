export type ProductType = 'Higher IQ' | 'HRMS Portal' | 'Both';
export type LeadPriority = 'High' | 'Medium' | 'Low';
export type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Replied'
  | 'Demo Booked'
  | 'Demo Done'
  | 'Won'
  | 'Lost'
  | 'Archived';

export interface LeadStageHistoryItem {
  id: string;
  leadId: string;
  fromStage: LeadStatus | null;
  toStage: LeadStatus;
  changedBy: string | null;
  notes: string | null;
  lostReason: string | null;
  createdAt: string;
}

export interface StageChangePayload {
  stage: LeadStatus;
  notes?: string | null;
  lostReason?: string | null;
}

export interface LeadPipelineStageGroup {
  stage: LeadStatus;
  count: number;
  totalValue: number;
  leads: Lead[];
}

export interface QualificationBreakdownItem {
  factor: string;
  points: number;
  description: string;
}

export interface QualificationPreviewResult {
  score: number;
  calculatedPriority: LeadPriority;
  hasAppropriateContact: boolean;
  fitSignalsRating: 'Strong' | 'Moderate' | 'Weak';
  scoreBreakdown: QualificationBreakdownItem[];
  qualificationNotes: string;
  isHighPriorityAllowed: boolean;
  validationReason?: string;
}

export type LeadSource =
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

export const LEAD_SOURCES: LeadSource[] = [
  'LinkedIn',
  'Email',
  'Phone',
  'WhatsApp',
  'Website',
  'Free ATS Score Check',
  'LinkedIn Content',
  'Referral',
  'Partner',
  'Other',
];

export interface Lead {
  id: string;
  companyId: string;
  companyName: string;
  companyWebsite?: string;
  companyDomain?: string;
  companyIndustry?: string;
  companyLocation?: string;
  companyProductFit?: string;
  contactId: string | null;
  contactName: string | null;
  contactTitle: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactDecisionMaker: boolean;
  campaignId?: string | null;
  campaignName?: string | null;
  product: ProductType;
  title: string;
  value: number;
  status: LeadStatus;
  priority: LeadPriority;
  hiringVolume: 'High' | 'Medium' | 'Low' | 'None';
  hiringMultipleRoles: boolean;
  manualHrProcesses: boolean;
  existingTools: string | null;
  companySize: string | null;
  decisionMakerIdentified: boolean;
  qualificationScore: number;
  qualificationNotes: string | null;
  notes: string | null;
  source: string | null;
  referrerName?: string | null;
  referrerContact?: string | null;
  partnerName?: string | null;
  referralNotes?: string | null;
  atsScore?: number | null;
  assignedTo: string | null;
  lostReason?: string | null;
  wonAt?: string | null;
  lostAt?: string | null;
  stageChangedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  qualificationBreakdown?: QualificationPreviewResult;
  stageHistory?: LeadStageHistoryItem[];
  followUpStatus?: string;
  followUpDueDate?: string | null;
  detectedSignals?: string[];
  companyCurrentTools?: string | null;
  companyHiringSignals?: string | null;
}

export interface CreateLeadPayload {
  companyId: string;
  contactId?: string | null;
  campaignId?: string | null;
  product: ProductType;
  title: string;
  value?: number;
  status?: LeadStatus;
  priority?: LeadPriority;
  hiringVolume?: 'High' | 'Medium' | 'Low' | 'None';
  hiringMultipleRoles?: boolean;
  manualHrProcesses?: boolean;
  existingTools?: string | null;
  companySize?: string | null;
  decisionMakerIdentified?: boolean;
  qualificationNotes?: string | null;
  notes?: string | null;
  source?: string | null;
  referrerName?: string | null;
  referrerContact?: string | null;
  partnerName?: string | null;
  referralNotes?: string | null;
  atsScore?: number | null;
  assignedTo?: string | null;
  allowDuplicate?: boolean;
}

export interface UpdateLeadPayload {
  companyId?: string;
  contactId?: string | null;
  campaignId?: string | null;
  product?: ProductType;
  title?: string;
  value?: number;
  status?: LeadStatus;
  priority?: LeadPriority;
  hiringVolume?: 'High' | 'Medium' | 'Low' | 'None';
  hiringMultipleRoles?: boolean;
  manualHrProcesses?: boolean;
  existingTools?: string | null;
  companySize?: string | null;
  decisionMakerIdentified?: boolean;
  qualificationNotes?: string | null;
  notes?: string | null;
  source?: string | null;
  referrerName?: string | null;
  referrerContact?: string | null;
  partnerName?: string | null;
  referralNotes?: string | null;
  atsScore?: number | null;
  assignedTo?: string | null;
  allowDuplicate?: boolean;
}

export interface LeadFilterParams {
  search?: string;
  product?: string;
  priority?: string;
  status?: string;
  campaignId?: string;
  campaign?: string;
  source?: string;
  companyId?: string;
  contactId?: string;
  minScore?: number;
  includeArchived?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
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
}

export interface DuplicateLeadCheckResult {
  isDuplicate: boolean;
  existingLead?: {
    id: string;
    title: string;
    product: string;
    status: string;
    companyName: string;
  };
}
