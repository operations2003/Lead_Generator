import { apiClient } from './client';
import { ApiResponse } from './types';
import { AtsScoreLeadCapturePayload, Lead } from '../types';

export interface AtsScoreLeadCaptureResponse {
  lead: Lead;
  isExistingContact: boolean;
  contactId: string;
  companyId: string;
}

export interface ILeadCaptureService {
  captureAtsScoreLead(payload: AtsScoreLeadCapturePayload): Promise<ApiResponse<AtsScoreLeadCaptureResponse>>;
}

export class LeadCaptureService implements ILeadCaptureService {
  async captureAtsScoreLead(payload: AtsScoreLeadCapturePayload): Promise<ApiResponse<AtsScoreLeadCaptureResponse>> {
    return apiClient.post<AtsScoreLeadCaptureResponse>('/lead-capture/ats-score', payload);
  }
}

export const leadCaptureService = new LeadCaptureService();
