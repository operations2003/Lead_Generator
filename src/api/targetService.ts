import { apiClient } from './client';
import { ApiResponse } from './types';
import { WeeklyTargetSummary, SaveWeeklyTargetPayload } from '../types';

export interface ITargetService {
  getWeeklyTargets(params?: { startDate?: string; endDate?: string; userId?: string }): Promise<ApiResponse<WeeklyTargetSummary[]>>;
  saveWeeklyTarget(payload: SaveWeeklyTargetPayload): Promise<ApiResponse<WeeklyTargetSummary>>;
}

export class TargetService implements ITargetService {
  async getWeeklyTargets(params?: { startDate?: string; endDate?: string; userId?: string }): Promise<ApiResponse<WeeklyTargetSummary[]>> {
    return apiClient.get<WeeklyTargetSummary[]>('/targets/weekly', params as Record<string, unknown>);
  }

  async saveWeeklyTarget(payload: SaveWeeklyTargetPayload): Promise<ApiResponse<WeeklyTargetSummary>> {
    return apiClient.post<WeeklyTargetSummary>('/targets/weekly', payload);
  }
}

export const targetService = new TargetService();
