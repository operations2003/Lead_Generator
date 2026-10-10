export interface HunterEmailSource {
  domain: string;
  uri: string;
  extracted_on: string;
  still_on_page: boolean;
}

export interface HunterEmail {
  value: string;
  type: 'personal' | 'generic';
  confidence: number;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  seniority: string | null;
  department: string | null;
  linkedin: string | null;
  twitter: string | null;
  phone_number: string | null;
  verification?: {
    date: string | null;
    status: string | null;
  };
  sources: HunterEmailSource[];
}

export interface HunterDiscoveredCompany {
  domain: string;
  organization: string;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  industry?: string | null;
  description?: string | null;
  headcount?: string | null;
  emails_count: {
    personal: number;
    generic: number;
    total: number;
  };
}

export interface HunterDomainSearchResult {
  domain: string;
  organization: string;
  description?: string | null;
  industry?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  pattern?: string | null;
  emails: HunterEmail[];
}

export interface HunterEmailFinderResult {
  first_name: string;
  last_name: string;
  email: string | null;
  score: number;
  domain: string;
  position: string | null;
  company?: string | null;
  sources: HunterEmailSource[];
  verification?: {
    date: string | null;
    status: string | null;
  };
}

export interface HunterEmailVerifierResult {
  email: string;
  status: 'valid' | 'invalid' | 'accept_all' | 'webmail' | 'disposable' | 'unknown';
  result: 'deliverable' | 'risky' | 'undeliverable';
  score: number;
  regexp: boolean;
  gibberish: boolean;
  disposable: boolean;
  webmail: boolean;
  mx_records: boolean;
  smtp_server: boolean;
  smtp_check: boolean;
  accept_all: boolean;
  sources: HunterEmailSource[];
}

export interface HunterAccountInfo {
  first_name: string;
  last_name: string;
  email: string;
  plan_name: string;
  plan_level: number;
  reset_date: string;
  requests: {
    searches: {
      used: number;
      available: number;
    };
    verifications: {
      used: number;
      available: number;
    };
  };
  calls: {
    used: number;
    available: number;
  };
}

export interface HunterProspectLead {
  id: string;
  domain: string;
  organization: string;
  industry?: string;
  location?: string;
  headcount?: string;
  description?: string;
  emailsCount: {
    personal: number;
    generic: number;
    total: number;
  };
  emails: HunterEmail[];
  inCrm: boolean;
  existingCompanyId?: string;
}

export interface HunterProspectParams {
  industry?: string;
  location?: string;
  keywords?: string[];
  query?: string;
  limit?: number;
  enrichEmails?: boolean;
}

export interface HunterStatusResponse {
  configured: boolean;
  message?: string;
  account?: HunterAccountInfo;
  error?: string;
  errorCode?: string;
}
