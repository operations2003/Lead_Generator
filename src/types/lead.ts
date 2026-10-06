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
  assignedTo: string | null;
  lostReason?: string | null;
  wonAt?: string | null;
  lostAt?: string | null;
  stageChangedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  qualificationBreakdown?: QualificationPreviewResult;
  stageHistory?: LeadStageHistoryItem[];
}

export interface CreateLeadPayload {
  companyId: string;
  contactId?: string | null;
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
  assignedTo?: string | null;
  allowDuplicate?: boolean;
}

export interface UpdateLeadPayload {
  companyId?: string;
  contactId?: string | null;
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
  assignedTo?: string | null;
  allowDuplicate?: boolean;
}

export interface LeadFilterParams {
  search?: string;
  product?: string;
  priority?: string;
  status?: string;
  companyId?: string;
  contactId?: string;
  minScore?: number;
  includeArchived?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
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
