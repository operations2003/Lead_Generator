import { apiClient } from './client';
import { ApiResponse, PaginatedResponse } from './types';
import { FollowUp, FollowUpFilterParams } from '../types';

export interface IFollowUpService {
  getFollowUps(params?: FollowUpFilterParams): Promise<ApiResponse<PaginatedResponse<FollowUp>>>;
  getFollowUpById(id: string): Promise<ApiResponse<FollowUp>>;
  createFollowUp(followUp: Omit<FollowUp, 'id' | 'createdAt'>): Promise<ApiResponse<FollowUp>>;
  updateFollowUp(id: string, followUp: Partial<FollowUp>): Promise<ApiResponse<FollowUp>>;
  deleteFollowUp(id: string): Promise<ApiResponse<void>>;
}

export class FollowUpService implements IFollowUpService {
  async getFollowUps(params?: FollowUpFilterParams): Promise<ApiResponse<PaginatedResponse<FollowUp>>> {
    return apiClient.get<PaginatedResponse<FollowUp>>('/follow-ups', params as Record<string, unknown>);
  }

  async getFollowUpById(id: string): Promise<ApiResponse<FollowUp>> {
    return apiClient.get<FollowUp>(`/follow-ups/${id}`);
  }

  async createFollowUp(followUp: Omit<FollowUp, 'id' | 'createdAt'>): Promise<ApiResponse<FollowUp>> {
    return apiClient.post<FollowUp>('/follow-ups', followUp);
  }

  async updateFollowUp(id: string, followUp: Partial<FollowUp>): Promise<ApiResponse<FollowUp>> {
    return apiClient.put<FollowUp>(`/follow-ups/${id}`, followUp);
  }

  async deleteFollowUp(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/follow-ups/${id}`);
  }
}

export const followUpService = new FollowUpService();
