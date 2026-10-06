import { apiClient } from './client';
import { ApiResponse } from './types';
import { PerformanceReport, ReportingOverview } from '../types';

export interface IReportService {
  getOverview(params?: { startDate?: string; endDate?: string; period?: string }): Promise<ApiResponse<ReportingOverview>>;
  getPerformanceReport(period: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly'): Promise<ApiResponse<PerformanceReport>>;
}

export class ReportService implements IReportService {
  async getOverview(params?: { startDate?: string; endDate?: string; period?: string }): Promise<ApiResponse<ReportingOverview>> {
    return apiClient.get<ReportingOverview>('/reporting/overview', params as Record<string, unknown>);
  }

  async getPerformanceReport(period: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly'): Promise<ApiResponse<PerformanceReport>> {
    return apiClient.get<PerformanceReport>('/reports/performance', { period });
  }
}

export const reportService = new ReportService();
export const reportingService = reportService;
