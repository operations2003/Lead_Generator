export type OutreachTemplateType =
  | 'Initial Email'
  | 'LinkedIn Message'
  | 'Follow-up Email'
  | 'Call Script'
  | 'WhatsApp Message'
  | 'Demo Follow-up'
  | 'Final Follow-up'
  | 'Email'
  | 'LinkedIn'
  | 'Phone'
  | 'WhatsApp'
  | 'Other';

export interface OutreachTemplate {
  id: string;
  name: string;
  type: OutreachTemplateType;
  product: string;
  subject?: string | null;
  body: string;
  sequenceDay?: number | null;
  status: 'Active' | 'Archived';
  createdAt: string;
  updatedAt?: string;
}

export interface CreateTemplatePayload {
  name: string;
  type: OutreachTemplateType;
  product?: string;
  subject?: string | null;
  body: string;
  sequenceDay?: number | null;
}

export interface UpdateTemplatePayload {
  name?: string;
  type?: OutreachTemplateType;
  product?: string;
  subject?: string | null;
  body?: string;
  sequenceDay?: number | null;
  status?: 'Active' | 'Archived';
}
