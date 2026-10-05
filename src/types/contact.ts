export interface Contact {
  id: string;
  companyId: string;
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  title: string;
  department: string;
  decisionRole: 'Decision Maker' | 'Influencer' | 'User' | 'Gatekeeper';
  linkedInUrl?: string;
  status: 'Active' | 'Unresponsive' | 'Bounced';
  createdAt: string;
}

export interface ContactFilterParams {
  search?: string;
  companyId?: string;
  decisionRole?: string;
  page?: number;
  limit?: number;
}
