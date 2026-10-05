import { apiClient } from './client';
import { ApiResponse, PaginatedResponse } from './types';
import { Contact, ContactFilterParams } from '../types';

export interface IContactService {
  getContacts(params?: ContactFilterParams): Promise<ApiResponse<PaginatedResponse<Contact>>>;
  getContactById(id: string): Promise<ApiResponse<Contact>>;
  createContact(contact: Omit<Contact, 'id' | 'createdAt'>): Promise<ApiResponse<Contact>>;
  updateContact(id: string, contact: Partial<Contact>): Promise<ApiResponse<Contact>>;
  deleteContact(id: string): Promise<ApiResponse<void>>;
}

export class ContactService implements IContactService {
  async getContacts(params?: ContactFilterParams): Promise<ApiResponse<PaginatedResponse<Contact>>> {
    return apiClient.get<PaginatedResponse<Contact>>('/contacts', params as Record<string, unknown>);
  }

  async getContactById(id: string): Promise<ApiResponse<Contact>> {
    return apiClient.get<Contact>(`/contacts/${id}`);
  }

  async createContact(contact: Omit<Contact, 'id' | 'createdAt'>): Promise<ApiResponse<Contact>> {
    return apiClient.post<Contact>('/contacts', contact);
  }

  async updateContact(id: string, contact: Partial<Contact>): Promise<ApiResponse<Contact>> {
    return apiClient.put<Contact>(`/contacts/${id}`, contact);
  }

  async deleteContact(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/contacts/${id}`);
  }
}

export const contactService = new ContactService();
