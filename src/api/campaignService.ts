import { apiClient } from './client';
import { ApiResponse, PaginatedResponse } from './types';
import { Campaign, CampaignPayload, CampaignFilterParams, Lead } from '../types';

export interface ICampaignService {
  getCampaigns(params?: CampaignFilterParams): Promise<ApiResponse<PaginatedResponse<Campaign>>>;
  getCampaignById(id: string): Promise<ApiResponse<Campaign>>;
  getCampaignLeads(id: string): Promise<ApiResponse<Lead[]>>;
  createCampaign(campaign: CampaignPayload): Promise<ApiResponse<Campaign>>;
  updateCampaign(id: string, campaign: Partial<CampaignPayload>): Promise<ApiResponse<Campaign>>;
  archiveCampaign(id: string): Promise<ApiResponse<Campaign>>;
  deleteCampaign(id: string): Promise<ApiResponse<void>>;
}

export class CampaignService implements ICampaignService {
  async getCampaigns(params?: CampaignFilterParams): Promise<ApiResponse<PaginatedResponse<Campaign>>> {
    return apiClient.get<PaginatedResponse<Campaign>>('/campaigns', params as Record<string, unknown>);
  }

  async getCampaignById(id: string): Promise<ApiResponse<Campaign>> {
    return apiClient.get<Campaign>(`/campaigns/${id}`);
  }

  async getCampaignLeads(id: string): Promise<ApiResponse<Lead[]>> {
    return apiClient.get<Lead[]>(`/campaigns/${id}/leads`);
  }

  async createCampaign(campaign: CampaignPayload): Promise<ApiResponse<Campaign>> {
    return apiClient.post<Campaign>('/campaigns', campaign);
  }

  async updateCampaign(id: string, campaign: Partial<CampaignPayload>): Promise<ApiResponse<Campaign>> {
    return apiClient.patch<Campaign>(`/campaigns/${id}`, campaign);
  }

  async archiveCampaign(id: string): Promise<ApiResponse<Campaign>> {
    return apiClient.patch<Campaign>(`/campaigns/${id}/archive`, {});
  }

  async deleteCampaign(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/campaigns/${id}`);
  }
}

export const campaignService = new CampaignService();
