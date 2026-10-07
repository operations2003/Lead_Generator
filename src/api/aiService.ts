import { apiClient } from './client';
import { ApiResponse } from './types';

export interface AiLeadGenCriteriaPayload {
  industry?: string;
  product?: 'Higher IQ' | 'HRMS Portal' | 'Both';
  location?: string;
  companySize?: string;
  targetRole?: string;
  hiringSignals?: string;
  count?: number;
  autoSave?: boolean;
}

export interface AiGeneratedLeadResponseItem {
  title: string;
  product: 'Higher IQ' | 'HRMS Portal' | 'Both';
  value: number;
  priority: 'High' | 'Medium' | 'Low';
  qualificationScore: number;
  qualificationNotes: string;
  painPoints: string[];
  recommendedPitch: string;
  company: {
    name: string;
    website: string;
    industry: string;
    location: string;
    employeeSize: string;
    employeeCount: number;
    currentTools: string;
    hiringSignals: string;
    productFit: 'High' | 'Medium' | 'Low';
    notes: string;
  };
  contact: {
    name: string;
    email: string;
    phone?: string;
    title: string;
    department: string;
    decisionMaker: number;
    linkedinUrl?: string;
  };
  savedIds?: {
    companyId: string;
    contactId: string;
    leadId: string;
  };
}

export interface AiQualificationResponse {
  leadId: string;
  qualificationScore: number;
  priority: 'High' | 'Medium' | 'Low';
  productFitAnalysis: string;
  keyPainPoints: string[];
  buyingTriggers: string[];
  recommendedNextStep: string;
  suggestedDiscoveryQuestions: string[];
}

export interface AiOutreachPayload {
  leadId?: string;
  companyName?: string;
  contactName?: string;
  contactTitle?: string;
  product?: 'Higher IQ' | 'HRMS Portal' | 'Both';
  channel: 'Email' | 'LinkedIn' | 'Phone' | 'WhatsApp';
  cadenceDay?: number;
  customNotes?: string;
}

export interface AiOutreachResponse {
  channel: string;
  subject?: string;
  content: string;
  keyHooks: string[];
  callToAction: string;
}

export interface AiStatusResponse {
  status: string;
  isConfigured: boolean;
  model: string;
  supportedFeatures: string[];
}

export const aiService = {
  getStatus(): Promise<ApiResponse<AiStatusResponse>> {
    return apiClient.get<AiStatusResponse>('/ai/status');
  },

  generateLeads(criteria: AiLeadGenCriteriaPayload): Promise<ApiResponse<AiGeneratedLeadResponseItem[]>> {
    return apiClient.post<AiGeneratedLeadResponseItem[]>('/ai/generate-leads', criteria);
  },

  qualifyLead(leadId: string): Promise<ApiResponse<AiQualificationResponse>> {
    return apiClient.post<AiQualificationResponse>('/ai/qualify-lead', { leadId });
  },

  generateOutreach(payload: AiOutreachPayload): Promise<ApiResponse<AiOutreachResponse>> {
    return apiClient.post<AiOutreachResponse>('/ai/outreach', payload);
  },
};

