import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { getDb } from '../db/database';
import { config } from '../config';
import { CompanyService, extractDomain, normalizeName } from './companyService';
import { ContactService } from './contactService';
import { LeadService } from './leadService';

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

export interface HunterDiscoverCriteria {
  query?: string;
  industry?: string;
  location?: string;
  keywords?: string[];
  limit?: number;
  offset?: number;
}

export class HunterService {
  private db: DatabaseSync;
  private apiKey: string;
  private baseUrl = 'https://api.hunter.io/v2';
  private companyService: CompanyService;
  private contactService: ContactService;
  private leadService: LeadService;
  private cache = new Map<string, { data: unknown; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  constructor(db?: DatabaseSync, customApiKey?: string) {
    this.db = db || getDb();
    this.apiKey = customApiKey !== undefined ? customApiKey : config.hunterApiKey;
    this.companyService = new CompanyService(this.db);
    this.contactService = new ContactService(this.db);
    this.leadService = new LeadService(this.db);
  }

  public setApiKey(key: string): void {
    this.apiKey = key;
  }

  public getApiKey(): string {
    return this.apiKey;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  private getCached<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.data as T;
  }

  private setCached<T>(key: string, data: T, ttlMs = this.CACHE_TTL_MS): void {
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  /**
   * Internal HTTP caller for Hunter API with header auth and custom error mapping
   */
  private async requestHunter<T>(
    endpoint: string,
    options: { method?: string; body?: unknown; searchParams?: Record<string, string | number | undefined> } = {}
  ): Promise<T> {
    if (!this.isConfigured()) {
      const err = new Error('HUNTER_API_KEY is not configured in backend environment variables.');
      (err as unknown as { code: string; status: number }).code = 'HUNTER_NOT_CONFIGURED';
      (err as unknown as { status: number }).status = 400;
      throw err;
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (options.searchParams) {
      for (const [key, val] of Object.entries(options.searchParams)) {
        if (val !== undefined && val !== null && val !== '') {
          url.searchParams.set(key, String(val));
        }
      }
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'X-API-KEY': this.apiKey,
      'User-Agent': 'LeadGenerator-Prospector/1.0',
    };

    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
    } catch (netErr) {
      const err = new Error(`Failed to connect to Hunter.io API: ${(netErr as Error).message}`);
      (err as unknown as { code: string; status: number }).code = 'HUNTER_NETWORK_ERROR';
      (err as unknown as { status: number }).status = 502;
      throw err;
    }

    const rawJson = (await response.json().catch(() => null)) as {
      data?: T;
      meta?: unknown;
      errors?: Array<{ id?: string; code?: number; details?: string }>;
    } | null;

    if (!response.ok) {
      const firstError = rawJson?.errors?.[0];
      const errorId = firstError?.id || 'error';
      const errorDetail = firstError?.details || `Hunter API responded with status ${response.status}`;

      if (response.status === 401) {
        const err = new Error('Hunter.io authentication failed. Please verify your HUNTER_API_KEY in .env.');
        (err as unknown as { code: string; status: number }).code = 'HUNTER_AUTH_FAILED';
        (err as unknown as { status: number }).status = 401;
        throw err;
      }

      if (response.status === 403) {
        if (errorId === 'upgrade_required' || endpoint.includes('/discover')) {
          const err = new Error(
            'Your Hunter.io plan does not include access to the POST /v2/discover endpoint. Discover requires a Hunter Data Platform or Enterprise plan. You can use Domain Search to retrieve emails for specific company domains.'
          );
          (err as unknown as { code: string; status: number }).code = 'HUNTER_PLAN_UPGRADE_REQUIRED';
          (err as unknown as { status: number }).status = 403;
          throw err;
        }
        const err = new Error(`Hunter.io access forbidden: ${errorDetail}`);
        (err as unknown as { code: string; status: number }).code = 'HUNTER_FORBIDDEN';
        (err as unknown as { status: number }).status = 403;
        throw err;
      }

      if (response.status === 429) {
        const err = new Error('Hunter.io API rate limit reached or search credits exhausted.');
        (err as unknown as { code: string; status: number }).code = 'HUNTER_RATE_LIMIT';
        (err as unknown as { status: number }).status = 429;
        throw err;
      }

      const err = new Error(`Hunter.io API error: ${errorDetail}`);
      (err as unknown as { code: string; status: number }).code = `HUNTER_${errorId.toUpperCase()}`;
      (err as unknown as { status: number }).status = response.status;
      throw err;
    }

    return (rawJson?.data ?? rawJson) as T;
  }

  /**
   * GET /v2/account
   * Retrieves live account status, subscription plan, remaining searches, and verifications.
   */
  public async getAccountInfo(): Promise<HunterAccountInfo> {
    const cached = this.getCached<HunterAccountInfo>('hunter_account_info');
    if (cached) return cached;

    const data = await this.requestHunter<HunterAccountInfo>('/account');
    this.setCached('hunter_account_info', data, 60 * 1000); // cache for 1 minute
    return data;
  }

  /**
   * POST /v2/discover
   * Discovers companies matching category, industry, location, and keywords.
   */
  public async discoverCompanies(
    criteria: HunterDiscoverCriteria
  ): Promise<{ companies: HunterDiscoveredCompany[]; meta: { results: number; limit: number; offset: number } }> {
    const cacheKey = `discover_${JSON.stringify(criteria)}`;
    const cached = this.getCached<{ companies: HunterDiscoveredCompany[]; meta: { results: number; limit: number; offset: number } }>(cacheKey);
    if (cached) return cached;

    const limit = Math.min(Math.max(criteria.limit || 10, 1), 100);

    const filters: Record<string, unknown> = {};

    if (criteria.industry && criteria.industry.trim().length > 0) {
      filters.industry = { include: [criteria.industry.trim()] };
    }

    if (criteria.location && criteria.location.trim().length > 0) {
      filters.headquarters_location = {
        include: [{ city: criteria.location.trim() }],
      };
    }

    if (criteria.keywords && criteria.keywords.length > 0) {
      filters.keywords = { include: criteria.keywords };
    }

    let naturalQuery = criteria.query?.trim();
    if (!naturalQuery) {
      const parts: string[] = [];
      if (criteria.industry) parts.push(criteria.industry.trim());
      if (criteria.keywords && criteria.keywords.length > 0) parts.push(criteria.keywords.join(' '));
      if (criteria.location) parts.push(`in ${criteria.location.trim()}`);
      naturalQuery = parts.filter(Boolean).join(' ');
    }

    const payload: Record<string, unknown> = {
      limit,
    };
    if (naturalQuery) payload.query = naturalQuery;
    if (Object.keys(filters).length > 0) payload.filters = filters;

    let res: {
      data?: HunterDiscoveredCompany[];
      meta?: { results?: number; limit?: number; offset?: number };
    };

    try {
      res = await this.requestHunter<{
        data?: HunterDiscoveredCompany[];
        meta?: { results?: number; limit?: number; offset?: number };
      }>('/discover', {
        method: 'POST',
        body: payload,
      });
    } catch (err: unknown) {
      // Hunter Free plan returns HTTP 400 pagination_error when limit is specified < 100
      const errObj = err as { code?: string; status?: number; message?: string };
      if (errObj.status === 400 && (errObj.code === 'HUNTER_PAGINATION_ERROR' || errObj.message?.includes('100 results'))) {
        const fallbackPayload: Record<string, unknown> = {};
        if (naturalQuery) fallbackPayload.query = naturalQuery;
        if (Object.keys(filters).length > 0) fallbackPayload.filters = filters;

        res = await this.requestHunter<{
          data?: HunterDiscoveredCompany[];
          meta?: { results?: number; limit?: number; offset?: number };
        }>('/discover', {
          method: 'POST',
          body: fallbackPayload,
        });
      } else {
        throw err;
      }
    }

    const rawCompanies = Array.isArray(res) ? res : res.data || [];
    const companies = rawCompanies.slice(0, limit);
    const meta = (res as { meta?: { results?: number; limit?: number; offset?: number } }).meta || {
      results: rawCompanies.length,
      limit,
      offset: 0,
    };

    const result = {
      companies,
      meta: {
        results: meta.results ?? rawCompanies.length,
        limit,
        offset: meta.offset ?? 0,
      },
    };

    this.setCached(cacheKey, result);
    return result;
  }

  /**
   * GET /v2/domain-search
   * Retrieves professional and generic email addresses with confidence and sources.
   */
  public async domainSearch(
    domain: string,
    options: { limit?: number; type?: 'personal' | 'generic'; page?: number } = {}
  ): Promise<HunterDomainSearchResult> {
    const cleanDomain = extractDomain(domain) || domain.trim().toLowerCase();
    const cacheKey = `domain_search_${cleanDomain}_${options.limit || 10}_${options.type || 'all'}`;
    const cached = this.getCached<HunterDomainSearchResult>(cacheKey);
    if (cached) return cached;

    const limit = Math.min(Math.max(options.limit || 10, 1), 100);

    const searchParams: Record<string, string | number | undefined> = {
      domain: cleanDomain,
      limit,
    };
    if (options.type) searchParams.type = options.type;

    const data = await this.requestHunter<HunterDomainSearchResult>('/domain-search', {
      searchParams,
    });

    this.setCached(cacheKey, data);
    return data;
  }

  /**
   * GET /v2/email-finder
   * Searches for a person's verified email given their name and company domain.
   */
  public async findEmail(params: {
    domain: string;
    firstName: string;
    lastName: string;
    company?: string;
  }): Promise<HunterEmailFinderResult> {
    const cleanDomain = extractDomain(params.domain) || params.domain.trim().toLowerCase();
    const cacheKey = `email_finder_${cleanDomain}_${params.firstName}_${params.lastName}`;
    const cached = this.getCached<HunterEmailFinderResult>(cacheKey);
    if (cached) return cached;

    const searchParams: Record<string, string | undefined> = {
      domain: cleanDomain,
      first_name: params.firstName.trim(),
      last_name: params.lastName.trim(),
    };
    if (params.company) searchParams.company = params.company.trim();

    const data = await this.requestHunter<HunterEmailFinderResult>('/email-finder', {
      searchParams,
    });

    this.setCached(cacheKey, data);
    return data;
  }

  /**
   * GET /v2/email-verifier
   * Performs real-time deliverability check on a target email.
   * Only called on explicit user demand to conserve credits.
   */
  public async verifyEmail(email: string): Promise<HunterEmailVerifierResult> {
    const cleanEmail = email.trim().toLowerCase();
    const cacheKey = `email_verifier_${cleanEmail}`;
    const cached = this.getCached<HunterEmailVerifierResult>(cacheKey);
    if (cached) return cached;

    const data = await this.requestHunter<HunterEmailVerifierResult>('/email-verifier', {
      searchParams: { email: cleanEmail },
    });

    this.setCached(cacheKey, data);
    return data;
  }

  /**
   * High-level B2B Prospecting Orchestrator:
   * 1. Discovers target companies matching criteria via POST /v2/discover
   * 2. Concurrently enriches each discovered company with emails via GET /v2/domain-search
   * 3. Cross-references against internal CRM to flag existing accounts
   */
  public async b2bProspect(
    criteria: HunterDiscoverCriteria & { enrichEmails?: boolean }
  ): Promise<{
    prospects: HunterProspectLead[];
    total: number;
    account?: HunterAccountInfo;
    limitationNotice?: string;
  }> {
    let discoveredCompanies: HunterDiscoveredCompany[] = [];
    let limitationNotice: string | undefined;

    try {
      const discoverRes = await this.discoverCompanies(criteria);
      discoveredCompanies = discoverRes.companies;
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      if (errorObj.code === 'HUNTER_PLAN_UPGRADE_REQUIRED') {
        limitationNotice = errorObj.message;
        throw err;
      }
      throw err;
    }

    const enrichEmails = criteria.enrichEmails !== false;
    const prospects: HunterProspectLead[] = [];

    // Controlled concurrency batching: max 2 simultaneous domain search calls
    const BATCH_SIZE = 2;
    for (let i = 0; i < discoveredCompanies.length; i += BATCH_SIZE) {
      const batch = discoveredCompanies.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (company) => {
          let emails: HunterEmail[] = [];
          if (enrichEmails && company.domain) {
            try {
              const domainData = await this.domainSearch(company.domain, { limit: 10 });
              emails = domainData.emails || [];
            } catch {
              emails = [];
            }
          }

          // Check duplicate existence in local CRM
          const existingCompany = company.domain
            ? (this.db
                .prepare('SELECT id FROM companies WHERE normalized_domain = ? LIMIT 1')
                .get(extractDomain(company.domain) || company.domain.toLowerCase()) as { id: string } | undefined)
            : undefined;

          const prospect: HunterProspectLead = {
            id: `hunt_${crypto.randomUUID().slice(0, 8)}`,
            domain: company.domain,
            organization: company.organization || company.domain,
            industry: company.industry || criteria.industry,
            location: [company.city, company.region, company.country].filter(Boolean).join(', ') || criteria.location,
            headcount: company.headcount || undefined,
            description: company.description || undefined,
            emailsCount: company.emails_count || {
              personal: emails.filter((e) => e.type === 'personal').length,
              generic: emails.filter((e) => e.type === 'generic').length,
              total: emails.length,
            },
            emails,
            inCrm: Boolean(existingCompany),
            existingCompanyId: existingCompany?.id,
          };

          return prospect;
        })
      );

      prospects.push(...batchResults);
    }

    return {
      prospects,
      total: prospects.length,
      limitationNotice,
    };
  }

  /**
   * Saves selected Hunter prospect leads into CRM tables (companies, contacts, leads).
   */
  public async saveProspectsToCrm(
    prospects: HunterProspectLead[],
    userId?: string
  ): Promise<{
    savedCompanies: number;
    savedContacts: number;
    savedLeads: number;
    skippedDuplicates: number;
    errors: string[];
  }> {
    let savedCompanies = 0;
    let savedContacts = 0;
    let savedLeads = 0;
    let skippedDuplicates = 0;
    const errors: string[] = [];

    const currentUserId = userId || 'usr_admin_001';

    for (const p of prospects) {
      try {
        const cleanDomain = extractDomain(p.domain) || p.domain.toLowerCase().trim();
        const normName = normalizeName(p.organization);

        // 1. Company record: locate or create
        let companyId: string;
        const existingComp = this.db
          .prepare('SELECT id FROM companies WHERE normalized_domain = ? OR normalized_name = ? LIMIT 1')
          .get(cleanDomain, normName) as { id: string } | undefined;

        if (existingComp) {
          companyId = existingComp.id;
          skippedDuplicates++;
        } else {
          const comp = this.companyService.create({
            name: p.organization,
            website: p.domain.startsWith('http') ? p.domain : `https://${p.domain}`,
            industry: p.industry || 'IT & Software',
            location: p.location || 'Unspecified',
            employeeSize: p.headcount || '11-50',
            notes: p.description || 'Discovered via Hunter.io B2B Prospecting',
            productFit: 'High',
            status: 'Prospect',
          });
          companyId = comp.id;
          savedCompanies++;
        }

        // 2. Contacts creation
        let primaryContactId: string | undefined;

        for (const em of p.emails) {
          const contactEmail = em.value.toLowerCase().trim();
          const existingContact = this.db
            .prepare('SELECT id FROM contacts WHERE LOWER(email) = ? AND status != \'Archived\' LIMIT 1')
            .get(contactEmail) as { id: string } | undefined;

          if (existingContact) {
            if (!primaryContactId) primaryContactId = existingContact.id;
            continue;
          }

          const contactName =
            em.first_name || em.last_name
              ? [em.first_name, em.last_name].filter(Boolean).join(' ')
              : `${p.organization} Contact`;

          try {
            const createdContact = this.contactService.create({
              companyId,
              name: contactName,
              title: em.position || (em.type === 'personal' ? 'Professional' : 'Team Lead'),
              department: em.department || undefined,
              email: contactEmail,
              phone: em.phone_number || undefined,
              linkedinUrl: em.linkedin || undefined,
              notes: `Confidence: ${em.confidence}%. Sources: ${em.sources?.length || 0} web sources.`,
              allowDuplicate: false,
            });
            if (!primaryContactId) primaryContactId = createdContact.id;
            savedContacts++;
          } catch {
            // Already handled
          }
        }

        // 3. Create Lead in CRM pipeline
        const existingLead = this.db
          .prepare('SELECT id FROM leads WHERE company_id = ? AND status NOT IN (\'Won\', \'Lost\', \'Archived\') LIMIT 1')
          .get(companyId) as { id: string } | undefined;

        if (!existingLead) {
          this.leadService.create({
            title: `${p.organization} — Hunter.io Prospect`,
            companyId,
            contactId: primaryContactId,
            product: 'Higher IQ',
            value: 20000,
            priority: p.emails.length > 0 ? 'High' : 'Medium',
            source: 'Hunter.io',
            notes: `Discovered with ${p.emails.length} contact emails via Hunter.io API.`,
            assignedTo: currentUserId,
            allowDuplicate: true,
          });
          savedLeads++;
        }
      } catch (err) {
        errors.push(`Error saving ${p.organization}: ${(err as Error).message}`);
      }
    }

    return {
      savedCompanies,
      savedContacts,
      savedLeads,
      skippedDuplicates,
      errors,
    };
  }

  /**
   * Exports Hunter prospect leads to RFC 4180 CSV
   */
  public exportCsv(prospects: HunterProspectLead[]): string {
    const escapeCsv = (str: string | null | undefined): string => {
      if (str === null || str === undefined) return '""';
      const cleaned = String(str).replace(/"/g, '""');
      return `"${cleaned}"`;
    };

    const headers = [
      'Company Name',
      'Domain',
      'Industry',
      'Location',
      'Headcount',
      'Contact Name',
      'Job Title',
      'Email Address',
      'Email Type',
      'Confidence Score',
      'Phone Number',
      'LinkedIn',
      'Source URLs',
    ];

    const rows: string[] = [headers.join(',')];

    for (const p of prospects) {
      if (p.emails.length === 0) {
        rows.push(
          [
            escapeCsv(p.organization),
            escapeCsv(p.domain),
            escapeCsv(p.industry),
            escapeCsv(p.location),
            escapeCsv(p.headcount),
            '""',
            '""',
            '""',
            '""',
            '""',
            '""',
            '""',
            '""',
          ].join(',')
        );
      } else {
        for (const em of p.emails) {
          const contactName = [em.first_name, em.last_name].filter(Boolean).join(' ') || 'General Contact';
          const sourcesStr = (em.sources || []).map((s) => s.uri).slice(0, 3).join(' | ');

          rows.push(
            [
              escapeCsv(p.organization),
              escapeCsv(p.domain),
              escapeCsv(p.industry),
              escapeCsv(p.location),
              escapeCsv(p.headcount),
              escapeCsv(contactName),
              escapeCsv(em.position || 'N/A'),
              escapeCsv(em.value),
              escapeCsv(em.type),
              escapeCsv(`${em.confidence}%`),
              escapeCsv(em.phone_number || ''),
              escapeCsv(em.linkedin || ''),
              escapeCsv(sourcesStr),
            ].join(',')
          );
        }
      }
    }

    return rows.join('\r\n');
  }
}

export const hunterService = new HunterService();
