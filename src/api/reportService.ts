import { apiClient } from './client';
import { ApiResponse } from './types';
import { PerformanceReport } from '../types';

export interface IReportService {
  getPerformanceReport(period: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly'): Promise<ApiResponse<PerformanceReport>>;
}

export class ReportService implements IReportService {
  async getPerformanceReport(period: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly'): Promise<ApiResponse<PerformanceReport>> {
    return apiClient.get<PerformanceReport>('/reports/performance', { period });
  }
}

export const reportService = new ReportService();
