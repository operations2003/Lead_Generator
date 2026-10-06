import { apiClient } from './client';
import { ApiResponse, PaginatedResponse } from './types';
import { Company, CompanyFilterParams, CreateCompanyPayload, UpdateCompanyPayload } from '../types';

export interface ICompanyService {
  getCompanies(params?: CompanyFilterParams): Promise<ApiResponse<PaginatedResponse<Company>>>;
  getCompanyById(id: string): Promise<ApiResponse<Company>>;
  createCompany(company: CreateCompanyPayload): Promise<ApiResponse<Company>>;
  updateCompany(id: string, company: UpdateCompanyPayload): Promise<ApiResponse<Company>>;
  deleteCompany(id: string, permanent?: boolean): Promise<ApiResponse<{ message: string }>>;
  archiveCompany(id: string): Promise<ApiResponse<Company>>;
}

export class CompanyService implements ICompanyService {
  async getCompanies(params?: CompanyFilterParams): Promise<ApiResponse<PaginatedResponse<Company>>> {
    return apiClient.get<PaginatedResponse<Company>>('/companies', params as Record<string, unknown>);
  }

  async getCompanyById(id: string): Promise<ApiResponse<Company>> {
    return apiClient.get<Company>(`/companies/${id}`);
  }

  async createCompany(company: CreateCompanyPayload): Promise<ApiResponse<Company>> {
    return apiClient.post<Company>('/companies', company);
  }

  async updateCompany(id: string, company: UpdateCompanyPayload): Promise<ApiResponse<Company>> {
    return apiClient.patch<Company>(`/companies/${id}`, company);
  }

  async deleteCompany(id: string, permanent = false): Promise<ApiResponse<{ message: string }>> {
    const query = permanent ? '?permanent=true' : '';
    return apiClient.delete<{ message: string }>(`/companies/${id}${query}`);
  }

  async archiveCompany(id: string): Promise<ApiResponse<Company>> {
    return this.updateCompany(id, { status: 'Archived' });
  }
}

export const companyService = new CompanyService();

