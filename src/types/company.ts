export interface Company {
  id: string;
  name: string;
  domain: string;
  industry: string;
  employeeCount: number;
  location: string;
  itBudgetRange?: string;
  techStack: string[];
  leadStatus: 'Prospect' | 'Contacted' | 'Qualified' | 'Customer' | 'Unqualified';
  createdAt: string;
  updatedAt: string;
}

export interface CompanyFilterParams {
  search?: string;
  industry?: string;
  leadStatus?: string;
  minEmployees?: number;
  page?: number;
  limit?: number;
}
