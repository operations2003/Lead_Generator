import { apiClient } from './client';
import { ApiResponse, PaginatedResponse } from './types';
import { Lead, LeadFilterParams } from '../types';

export interface ILeadService {
  getLeads(params?: LeadFilterParams): Promise<ApiResponse<PaginatedResponse<Lead>>>;
  getLeadById(id: string): Promise<ApiResponse<Lead>>;
  createLead(lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Lead>>;
  updateLead(id: string, lead: Partial<Lead>): Promise<ApiResponse<Lead>>;
  deleteLead(id: string): Promise<ApiResponse<void>>;
}

export class LeadService implements ILeadService {
  async getLeads(params?: LeadFilterParams): Promise<ApiResponse<PaginatedResponse<Lead>>> {
    return apiClient.get<PaginatedResponse<Lead>>('/leads', params as Record<string, unknown>);
  }

  async getLeadById(id: string): Promise<ApiResponse<Lead>> {
    return apiClient.get<Lead>(`/leads/${id}`);
  }

  async createLead(lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Lead>> {
    return apiClient.post<Lead>('/leads', lead);
  }

  async updateLead(id: string, lead: Partial<Lead>): Promise<ApiResponse<Lead>> {
    return apiClient.put<Lead>(`/leads/${id}`, lead);
  }

  async deleteLead(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/leads/${id}`);
  }
}

export const leadService = new LeadService();
