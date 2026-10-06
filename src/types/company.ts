export type CompanyStatus =
  | 'Prospect'
  | 'Researching'
  | 'Contacted'
  | 'Qualified'
  | 'Customer'
  | 'Archived'
  | 'Unqualified';

export type ProductFitLevel = 'High' | 'Medium' | 'Low';

export interface RelatedContact {
  id: string;
  company_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  department: string | null;
  decision_maker: number;
  linkedin_url: string | null;
  created_at: string;
}

export interface RelatedLead {
  id: string;
  company_id: string;
  contact_id: string | null;
  title: string;
  value: number;
  status: string;
  priority: string;
  source: string | null;
  assigned_to: string | null;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  website: string;
  domain: string;
  industry: string;
  location: string;
  employeeSize: string;
  employeeCount: number;
  hiringSignals: string | null;
  currentTools: string | null;
  productFit: ProductFitLevel;
  leadRelevanceScore: number;
  notes: string | null;
  status: CompanyStatus;
  createdAt: string;
  updatedAt: string;
  contacts?: RelatedContact[];
  leads?: RelatedLead[];
}

export interface CreateCompanyPayload {
  name: string;
  website: string;
  industry: string;
  location: string;
  employeeSize: string;
  employeeCount?: number;
  hiringSignals?: string;
  currentTools?: string;
  productFit?: ProductFitLevel;
  leadRelevanceScore?: number;
  notes?: string;
  status?: CompanyStatus;
}

export interface UpdateCompanyPayload {
  name?: string;
  website?: string;
  industry?: string;
  location?: string;
  employeeSize?: string;
  employeeCount?: number;
  hiringSignals?: string;
  currentTools?: string;
  productFit?: ProductFitLevel;
  leadRelevanceScore?: number;
  notes?: string;
  status?: CompanyStatus;
}

export interface CompanyFilterParams {
  search?: string;
  industry?: string;
  location?: string;
  status?: string;
  employeeSize?: string;
  productFit?: string;
  includeArchived?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  hiringVolume?: string;
  hiringSignals?: string;
  signals?: string;
  existingTools?: string;
  currentTools?: string;
}

