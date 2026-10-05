import { apiClient } from './client';
import { ApiResponse, PaginatedResponse } from './types';
import { Campaign, CampaignFilterParams } from '../types';

export interface ICampaignService {
  getCampaigns(params?: CampaignFilterParams): Promise<ApiResponse<PaginatedResponse<Campaign>>>;
  getCampaignById(id: string): Promise<ApiResponse<Campaign>>;
  createCampaign(campaign: Omit<Campaign, 'id' | 'createdAt'>): Promise<ApiResponse<Campaign>>;
  updateCampaign(id: string, campaign: Partial<Campaign>): Promise<ApiResponse<Campaign>>;
  deleteCampaign(id: string): Promise<ApiResponse<void>>;
}

export class CampaignService implements ICampaignService {
  async getCampaigns(params?: CampaignFilterParams): Promise<ApiResponse<PaginatedResponse<Campaign>>> {
    return apiClient.get<PaginatedResponse<Campaign>>('/campaigns', params as Record<string, unknown>);
  }

  async getCampaignById(id: string): Promise<ApiResponse<Campaign>> {
    return apiClient.get<Campaign>(`/campaigns/${id}`);
  }

  async createCampaign(campaign: Omit<Campaign, 'id' | 'createdAt'>): Promise<ApiResponse<Campaign>> {
    return apiClient.post<Campaign>('/campaigns', campaign);
  }

  async updateCampaign(id: string, campaign: Partial<Campaign>): Promise<ApiResponse<Campaign>> {
    return apiClient.put<Campaign>(`/campaigns/${id}`, campaign);
  }

  async deleteCampaign(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/campaigns/${id}`);
  }
}

export const campaignService = new CampaignService();
