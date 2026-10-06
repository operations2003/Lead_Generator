import { apiClient } from './client';
import { ApiResponse } from './types';
import { Activity, CreateActivityPayload, UpdateActivityPayload } from '../types';

export class ActivityService {
  async getActivitiesByLead(leadId: string): Promise<ApiResponse<Activity[]>> {
    return apiClient.get<Activity[]>(`/activities/lead/${leadId}`);
  }

  async getActivityById(id: string): Promise<ApiResponse<Activity>> {
    return apiClient.get<Activity>(`/activities/${id}`);
  }

  async createActivity(payload: CreateActivityPayload): Promise<ApiResponse<Activity>> {
    return apiClient.post<Activity>('/activities', payload);
  }

  async updateActivity(id: string, payload: UpdateActivityPayload): Promise<ApiResponse<Activity>> {
    return apiClient.patch<Activity>(`/activities/${id}`, payload);
  }

  async deleteActivity(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete<{ message: string }>(`/activities/${id}`);
  }
}

export const activityService = new ActivityService();
