import { apiClient } from './client';
import { ApiResponse, PaginatedResponse } from './types';
import { Company, CompanyFilterParams } from '../types';

export interface ICompanyService {
  getCompanies(params?: CompanyFilterParams): Promise<ApiResponse<PaginatedResponse<Company>>>;
  getCompanyById(id: string): Promise<ApiResponse<Company>>;
  createCompany(company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Company>>;
  updateCompany(id: string, company: Partial<Company>): Promise<ApiResponse<Company>>;
  deleteCompany(id: string): Promise<ApiResponse<void>>;
}

export class CompanyService implements ICompanyService {
  async getCompanies(params?: CompanyFilterParams): Promise<ApiResponse<PaginatedResponse<Company>>> {
    return apiClient.get<PaginatedResponse<Company>>('/companies', params as Record<string, unknown>);
  }

  async getCompanyById(id: string): Promise<ApiResponse<Company>> {
    return apiClient.get<Company>(`/companies/${id}`);
  }

  async createCompany(company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Company>> {
    return apiClient.post<Company>('/companies', company);
  }

  async updateCompany(id: string, company: Partial<Company>): Promise<ApiResponse<Company>> {
    return apiClient.put<Company>(`/companies/${id}`, company);
  }

  async deleteCompany(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/companies/${id}`);
  }
}

export const companyService = new CompanyService();
