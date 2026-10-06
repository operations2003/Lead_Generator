import { apiClient } from './client';
import { ApiResponse, PaginatedResponse } from './types';
import {
  Lead,
  LeadFilterParams,
  CreateLeadPayload,
  UpdateLeadPayload,
  DuplicateLeadCheckResult,
  QualificationPreviewResult,
  ProductType,
  StageChangePayload,
  LeadPipelineStageGroup,
} from '../types';

export interface ILeadService {
  getLeads(params?: LeadFilterParams): Promise<ApiResponse<PaginatedResponse<Lead>>>;
  getLeadById(id: string): Promise<ApiResponse<Lead>>;
  createLead(lead: CreateLeadPayload): Promise<ApiResponse<Lead>>;
  updateLead(id: string, lead: UpdateLeadPayload): Promise<ApiResponse<Lead>>;
  deleteLead(id: string, permanent?: boolean): Promise<ApiResponse<{ message: string }>>;
  archiveLead(id: string): Promise<ApiResponse<{ message: string }>>;
  checkDuplicate(companyId: string, product: ProductType, excludeId?: string): Promise<ApiResponse<DuplicateLeadCheckResult>>;
  previewQualification(signals: unknown, companyId: string, contactId?: string | null): Promise<ApiResponse<QualificationPreviewResult>>;
}

export class LeadService implements ILeadService {
  async getLeads(params?: LeadFilterParams): Promise<ApiResponse<PaginatedResponse<Lead>>> {
    return apiClient.get<PaginatedResponse<Lead>>('/leads', params as Record<string, unknown>);
  }

  async getLeadById(id: string): Promise<ApiResponse<Lead>> {
    return apiClient.get<Lead>(`/leads/${id}`);
  }

  async createLead(lead: CreateLeadPayload): Promise<ApiResponse<Lead>> {
    return apiClient.post<Lead>('/leads', lead);
  }

  async updateLead(id: string, lead: UpdateLeadPayload): Promise<ApiResponse<Lead>> {
    return apiClient.patch<Lead>(`/leads/${id}`, lead);
  }

  async deleteLead(id: string, permanent = false): Promise<ApiResponse<{ message: string }>> {
    const query = permanent ? '?permanent=true' : '';
    return apiClient.delete<{ message: string }>(`/leads/${id}${query}`);
  }

  async archiveLead(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.deleteLead(id, false);
  }

  async checkDuplicate(companyId: string, product: ProductType, excludeId?: string): Promise<ApiResponse<DuplicateLeadCheckResult>> {
    const params: Record<string, string> = { companyId, product };
    if (excludeId) params.excludeId = excludeId;
    return apiClient.get<DuplicateLeadCheckResult>('/leads/check-duplicate', params);
  }

  async previewQualification(signals: Record<string, unknown>, companyId?: string, contactId?: string | null): Promise<ApiResponse<QualificationPreviewResult>> {
    return apiClient.post<QualificationPreviewResult>('/leads/preview-qualification', {
      signals,
      companyId,
      contactId,
    });
  }

  async getPipeline(params?: LeadFilterParams): Promise<ApiResponse<LeadPipelineStageGroup[]>> {
    return apiClient.get<LeadPipelineStageGroup[]>('/leads/pipeline', params as Record<string, unknown>);
  }

  async changeStage(id: string, payload: StageChangePayload): Promise<ApiResponse<Lead>> {
    return apiClient.patch<Lead>(`/leads/${id}/stage`, payload);
  }
}

export const leadService = new LeadService();
