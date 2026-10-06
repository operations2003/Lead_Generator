import { apiClient } from './client';
import { ApiResponse, PaginatedResponse } from './types';
import {
  Contact,
  ContactFilterParams,
  CreateContactPayload,
  UpdateContactPayload,
  DuplicateCheckResult,
} from '../types';

export interface IContactService {
  getContacts(params?: ContactFilterParams): Promise<ApiResponse<PaginatedResponse<Contact>>>;
  getContactById(id: string): Promise<ApiResponse<Contact>>;
  createContact(contact: CreateContactPayload): Promise<ApiResponse<Contact>>;
  updateContact(id: string, contact: UpdateContactPayload): Promise<ApiResponse<Contact>>;
  toggleDecisionMaker(id: string, decisionMaker?: boolean): Promise<ApiResponse<Contact>>;
  deleteContact(id: string, permanent?: boolean): Promise<ApiResponse<{ message: string }>>;
  archiveContact(id: string): Promise<ApiResponse<{ message: string }>>;
  checkDuplicate(email: string, companyId?: string, excludeId?: string): Promise<ApiResponse<DuplicateCheckResult>>;
}

export class ContactService implements IContactService {
  async getContacts(params?: ContactFilterParams): Promise<ApiResponse<PaginatedResponse<Contact>>> {
    return apiClient.get<PaginatedResponse<Contact>>('/contacts', params as Record<string, unknown>);
  }

  async getContactById(id: string): Promise<ApiResponse<Contact>> {
    return apiClient.get<Contact>(`/contacts/${id}`);
  }

  async createContact(contact: CreateContactPayload): Promise<ApiResponse<Contact>> {
    return apiClient.post<Contact>('/contacts', contact);
  }

  async updateContact(id: string, contact: UpdateContactPayload): Promise<ApiResponse<Contact>> {
    return apiClient.patch<Contact>(`/contacts/${id}`, contact);
  }

  async toggleDecisionMaker(id: string, decisionMaker?: boolean): Promise<ApiResponse<Contact>> {
    return apiClient.patch<Contact>(`/contacts/${id}/decision-maker`, { decisionMaker });
  }

  async deleteContact(id: string, permanent = false): Promise<ApiResponse<{ message: string }>> {
    const query = permanent ? '?permanent=true' : '';
    return apiClient.delete<{ message: string }>(`/contacts/${id}${query}`);
  }

  async archiveContact(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.deleteContact(id, false);
  }

  async checkDuplicate(email: string, companyId?: string, excludeId?: string): Promise<ApiResponse<DuplicateCheckResult>> {
    const params: Record<string, string> = { email };
    if (companyId) params.companyId = companyId;
    if (excludeId) params.excludeId = excludeId;
    return apiClient.get<DuplicateCheckResult>('/contacts/check-duplicate', params);
  }
}

export const contactService = new ContactService();
