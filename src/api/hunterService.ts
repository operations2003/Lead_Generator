import { apiClient } from './client';
import { ApiResponse } from './types';
import {
  HunterStatusResponse,
  HunterProspectParams,
  HunterProspectLead,
  HunterDiscoveredCompany,
  HunterDomainSearchResult,
  HunterEmailFinderResult,
  HunterEmailVerifierResult,
} from '../types';

export class HunterApiService {
  /**
   * Get Hunter.io API connection status, plan, and credit usage
   */
  async getStatus(): Promise<ApiResponse<HunterStatusResponse>> {
    return apiClient.get<HunterStatusResponse>('/hunter/status');
  }

  /**
   * Run full B2B prospecting (Discover + Domain Search email enrichment)
   */
  async prospect(
    params: HunterProspectParams
  ): Promise<
    ApiResponse<{
      prospects: HunterProspectLead[];
      total: number;
      limitationNotice?: string;
    }>
  > {
    return apiClient.post<{
      prospects: HunterProspectLead[];
      total: number;
      limitationNotice?: string;
    }>('/hunter/prospect', params);
  }

  /**
   * Hunter POST /v2/discover: discover companies matching criteria
   */
  async discover(
    criteria: HunterProspectParams
  ): Promise<ApiResponse<{ companies: HunterDiscoveredCompany[]; meta: { results: number; limit: number; offset: number } }>> {
    return apiClient.post<{ companies: HunterDiscoveredCompany[]; meta: { results: number; limit: number; offset: number } }>(
      '/hunter/discover',
      criteria
    );
  }

  /**
   * Hunter GET /v2/domain-search: get professional emails for a company domain
   */
  async domainSearch(
    domain: string,
    limit = 10,
    type?: 'personal' | 'generic'
  ): Promise<ApiResponse<HunterDomainSearchResult>> {
    return apiClient.get<HunterDomainSearchResult>('/hunter/domain-search', {
      domain,
      limit,
      type,
    });
  }

  /**
   * Hunter POST /v2/find-email: find a specific person's email given name and domain
   */
  async findEmail(params: {
    domain: string;
    firstName: string;
    lastName: string;
    company?: string;
  }): Promise<ApiResponse<HunterEmailFinderResult>> {
    return apiClient.post<HunterEmailFinderResult>('/hunter/find-email', params);
  }

  /**
   * Hunter GET /v2/email-verifier: on-demand deliverability verification
   */
  async verifyEmail(email: string): Promise<ApiResponse<HunterEmailVerifierResult>> {
    return apiClient.post<HunterEmailVerifierResult>('/hunter/verify-email', { email });
  }

  /**
   * Save selected Hunter prospects to Core CRM (companies, contacts, leads)
   */
  async saveToCrm(
    prospects: HunterProspectLead[]
  ): Promise<
    ApiResponse<{
      savedCompanies: number;
      savedContacts: number;
      savedLeads: number;
      skippedDuplicates: number;
      errors: string[];
    }>
  > {
    return apiClient.post<{
      savedCompanies: number;
      savedContacts: number;
      savedLeads: number;
      skippedDuplicates: number;
      errors: string[];
    }>('/hunter/save-crm', { prospects });
  }

  /**
   * Download CSV export for selected Hunter prospects
   */
  async exportCsv(prospects: HunterProspectLead[]): Promise<void> {
    const token = apiClient.getToken();
    const res = await fetch('/api/v1/hunter/export-csv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ prospects }),
    });

    if (!res.ok) {
      throw new Error(`Failed to export CSV: ${res.statusText}`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hunter_prospects_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}

export const hunterApiService = new HunterApiService();
