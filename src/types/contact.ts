import { RelatedLead } from './company';

export type ContactStatus = 'Active' | 'Contacted' | 'Qualified' | 'Unresponsive' | 'Do Not Contact' | 'Archived';

export interface Contact {
  id: string;
  companyId: string;
  companyName: string;
  companyWebsite?: string;
  companyDomain?: string;
  companyIndustry?: string;
  companyLocation?: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string;
  department: string | null;
  decisionMaker: boolean;
  linkedinUrl: string | null;
  notes: string | null;
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
  leads?: RelatedLead[];
}

export interface CreateContactPayload {
  name: string;
  title: string;
  companyId: string;
  email?: string;
  phone?: string;
  department?: string;
  decisionMaker?: boolean;
  linkedinUrl?: string;
  notes?: string;
  status?: ContactStatus;
  allowDuplicate?: boolean;
}

export interface UpdateContactPayload {
  name?: string;
  title?: string;
  companyId?: string;
  email?: string;
  phone?: string;
  department?: string;
  decisionMaker?: boolean;
  linkedinUrl?: string;
  notes?: string;
  status?: ContactStatus;
  allowDuplicate?: boolean;
}

export interface ContactFilterParams {
  search?: string;
  role?: string;
  jobTitle?: string;
  title?: string;
  companyId?: string;
  company?: string;
  decisionMaker?: boolean | string;
  status?: string;
  includeArchived?: boolean;
  productRelevance?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingContact?: {
    id: string;
    name: string;
    email: string;
    companyName: string;
  };
}
