import { apiClient } from './client';
import { ApiResponse, PaginatedResponse } from './types';
import { Lead, DiscoveryOptions, LeadDiscoveryFilterParams } from '../types';

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
}

export const discoveryService = new DiscoveryService();
