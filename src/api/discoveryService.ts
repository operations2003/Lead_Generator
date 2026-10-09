import { apiClient } from './client';
import { ApiResponse, PaginatedResponse } from './types';
import {
  Lead,
  DiscoveryOptions,
  LeadDiscoveryFilterParams,
  AutoDiscoveryPayload,
  DiscoveryJob,
  DiscoveredLead,
} from '../types';

export interface DiscoveryJobDetailsResponse {
  job: DiscoveryJob;
  leads: DiscoveredLead[];
  total: number;
}

export class DiscoveryService {
  /**
   * Fetch available lead sources, industries, products, stages, priorities, existing tools, and lead signals.
   */
  async getDiscoveryOptions(): Promise<ApiResponse<DiscoveryOptions>> {
    return apiClient.get<DiscoveryOptions>('/discovery/options');
  }

  /**
   * Execute advanced discovery search across company, contact, and lead dimensions.
   */
  async searchDiscoveryLeads(
    params?: LeadDiscoveryFilterParams
  ): Promise<ApiResponse<PaginatedResponse<Lead>>> {
    return apiClient.get<PaginatedResponse<Lead>>(
      '/discovery/leads',
      params as Record<string, unknown>
    );
  }

  /**
   * Run automated company discovery and contact enrichment.
   */
  async startAutoDiscovery(
    payload: AutoDiscoveryPayload
  ): Promise<ApiResponse<{ job: DiscoveryJob; leads: DiscoveredLead[] }>> {
    return apiClient.post<{ job: DiscoveryJob; leads: DiscoveredLead[] }>(
      '/discovery/auto-discover',
      payload
    );
  }

  /**
   * Fetch recent automated discovery jobs.
   */
  async getDiscoveryJobs(limit = 10): Promise<ApiResponse<DiscoveryJob[]>> {
    return apiClient.get<DiscoveryJob[]>('/discovery/jobs', { limit });
  }

  /**
   * Fetch details and discovered leads for a specific job.
   */
  async getDiscoveryJobDetails(
    jobId: string,
    params?: { search?: string; status?: string; hasContact?: boolean }
  ): Promise<ApiResponse<DiscoveryJobDetailsResponse>> {
    return apiClient.get<DiscoveryJobDetailsResponse>(
      `/discovery/jobs/${jobId}`,
      params as Record<string, unknown>
    );
  }

  /**
   * Save selected discovered leads to permanent CRM database.
   */
  async saveLeadsToCrm(
    jobId: string,
    leadIds: string[]
  ): Promise<ApiResponse<{ savedCount: number; errors: string[] }>> {
    return apiClient.post<{ savedCount: number; errors: string[] }>(
      `/discovery/jobs/${jobId}/save-crm`,
      { leadIds }
    );
  }

  /**
   * Get direct URL to download CSV export of discovered leads.
   */
  getExportCsvUrl(jobId: string): string {
    const token = localStorage.getItem('token');
    return `/api/v1/discovery/jobs/${jobId}/export-csv${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  }
}

export const discoveryService = new DiscoveryService();

