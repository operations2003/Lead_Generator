import { apiClient } from './client';
import { ApiResponse } from './types';
import { OutreachTemplate, CreateTemplatePayload, UpdateTemplatePayload, OutreachTemplateType } from '../types';

export interface ITemplateService {
  getTemplates(params?: { type?: OutreachTemplateType; product?: string; status?: string; search?: string }): Promise<ApiResponse<OutreachTemplate[]>>;
  getTemplateById(id: string): Promise<ApiResponse<OutreachTemplate>>;
  createTemplate(template: CreateTemplatePayload): Promise<ApiResponse<OutreachTemplate>>;
  updateTemplate(id: string, template: UpdateTemplatePayload): Promise<ApiResponse<OutreachTemplate>>;
  deleteTemplate(id: string): Promise<ApiResponse<void>>;
}

export class TemplateService implements ITemplateService {
  async getTemplates(params?: { type?: OutreachTemplateType; product?: string; status?: string; search?: string }): Promise<ApiResponse<OutreachTemplate[]>> {
    return apiClient.get<OutreachTemplate[]>('/templates', params as Record<string, unknown>);
  }

  async getTemplateById(id: string): Promise<ApiResponse<OutreachTemplate>> {
    return apiClient.get<OutreachTemplate>(`/templates/${id}`);
  }

  async createTemplate(template: CreateTemplatePayload): Promise<ApiResponse<OutreachTemplate>> {
    return apiClient.post<OutreachTemplate>('/templates', template);
  }

  async updateTemplate(id: string, template: UpdateTemplatePayload): Promise<ApiResponse<OutreachTemplate>> {
    return apiClient.patch<OutreachTemplate>(`/templates/${id}`, template);
  }

  async deleteTemplate(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/templates/${id}`);
  }
}

export const templateService = new TemplateService();
