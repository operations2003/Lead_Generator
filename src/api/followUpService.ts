import { apiClient } from './client';
import { ApiResponse } from './types';
import {
  FollowUp,
  FollowUpFilterParams,
  FollowUpsListResponse,
  FollowUpSummary,
  CreateFollowUpPayload,
  UpdateFollowUpPayload,
} from '../types';

export class FollowUpService {
  async getFollowUps(params?: FollowUpFilterParams): Promise<ApiResponse<FollowUpsListResponse>> {
    return apiClient.get<FollowUpsListResponse>('/follow-ups', params as Record<string, unknown>);
  }

  async getSummary(leadId?: string): Promise<ApiResponse<FollowUpSummary>> {
    const query = leadId ? { leadId } : undefined;
    return apiClient.get<FollowUpSummary>('/follow-ups/summary', query);
  }

  async getFollowUpById(id: string): Promise<ApiResponse<FollowUp>> {
    return apiClient.get<FollowUp>(`/follow-ups/${id}`);
  }

  async createFollowUp(payload: CreateFollowUpPayload): Promise<ApiResponse<FollowUp>> {
    return apiClient.post<FollowUp>('/follow-ups', payload);
  }

  async completeFollowUp(id: string, notes?: string): Promise<ApiResponse<FollowUp>> {
    return apiClient.patch<FollowUp>(`/follow-ups/${id}/complete`, { notes });
  }

  async rescheduleFollowUp(id: string, dueDate: string, notes?: string): Promise<ApiResponse<FollowUp>> {
    return apiClient.patch<FollowUp>(`/follow-ups/${id}/reschedule`, { dueDate, notes });
  }

  async updateFollowUp(id: string, payload: UpdateFollowUpPayload): Promise<ApiResponse<FollowUp>> {
    return apiClient.patch<FollowUp>(`/follow-ups/${id}`, payload);
  }

  async deleteFollowUp(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete<{ message: string }>(`/follow-ups/${id}`);
  }
}

export const followUpService = new FollowUpService();
