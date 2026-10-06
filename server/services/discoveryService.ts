import { DatabaseSync } from 'node:sqlite';
import { getDb } from '../db/database';
import {
  DiscoveryOptionsResponse,
  HIREIQ_LEAD_SIGNALS,
  HRMS_LEAD_SIGNALS,
  EXISTING_TOOLS,
  FOLLOW_UP_FILTER_STATUSES,
} from '../db/types';
import { LeadService, LeadFilterOptions, PaginatedLeadsResult } from './leadService';

export class DiscoveryService {
  private db: DatabaseSync;
  private leadService: LeadService;

  constructor(db?: DatabaseSync, leadService?: LeadService) {
    this.db = db || getDb();
    this.leadService = leadService || new LeadService(this.db);
  }

  /**
   * Retrieve available filter options and metadata for lead discovery.
   */
  public getDiscoveryOptions(): DiscoveryOptionsResponse {
    // 1. Lead Sources
    const sourceRows = this.db
      .prepare("SELECT DISTINCT source FROM leads WHERE source IS NOT NULL AND TRIM(source) != ''")
      .all() as unknown as { source: string }[];
    const dbSources = sourceRows.map((r) => r.source.trim()).filter(Boolean);
    const standardSources = [
      'LinkedIn',
      'Email',
      'Phone',
      'WhatsApp',
      'Website',
      'Free ATS Score Check',
      'LinkedIn Content',
      'Referral',
      'Partner',
      'IT Mapping Sourced',
      'Other',
    ];
    const leadSources = Array.from(new Set([...standardSources, ...dbSources]));

    // 2. Industries
    const industryRows = this.db
      .prepare("SELECT DISTINCT industry FROM companies WHERE industry IS NOT NULL AND TRIM(industry) != ''")
      .all() as unknown as { industry: string }[];
    const dbIndustries = industryRows.map((r) => r.industry.trim()).filter(Boolean);
    const standardIndustries = [
      'IT Services & Consulting',
      'Software Development',
      'Staffing & Recruiting',
      'Cloud & Cybersecurity',
      'Financial Services',
      'Healthcare & Life Sciences',
      'E-commerce & Retail',
      'EdTech',
      'Manufacturing & Logistics',
    ];
    const industries = Array.from(new Set([...standardIndustries, ...dbIndustries]));

    // 3. Products
    const products = ['Higher IQ', 'HRMS Portal', 'Both'];

    // 4. Stages
    const stages = [
      'New',
      'Contacted',
      'Replied',
      'Demo Booked',
      'Demo Done',
      'Won',
      'Lost',
      'Archived',
    ];

    // 5. Priorities
    const priorities = ['High', 'Medium', 'Low'];

    // 6. Existing tools (as requested in Phase 9 requirements)
    const existingTools = [...EXISTING_TOOLS];

    // 7. Lead Signals
    const leadSignals = {
      hireIq: [...HIREIQ_LEAD_SIGNALS],
      hrms: [...HRMS_LEAD_SIGNALS],
    };

    // 8. Employee Sizes
    const employeeSizes = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

    // 9. Product Fits
    const productFits = ['High', 'Medium', 'Low'];

    // 10. Follow-Up Statuses
    const followUpStatuses = [...FOLLOW_UP_FILTER_STATUSES];

    return {
      leadSources,
      industries,
      products,
      stages,
      priorities,
      existingTools,
      leadSignals,
      employeeSizes,
      productFits,
      followUpStatuses,
    };
  }

  /**
   * Search and discover leads using multifaceted search criteria.
   */
  public searchLeads(options: LeadFilterOptions): PaginatedLeadsResult {
    return this.leadService.list(options);
  }

  public getLeadSources(): string[] {
    return this.getDiscoveryOptions().leadSources;
  }

  public getIndustries(): string[] {
    return this.getDiscoveryOptions().industries;
  }

  public getProducts(): string[] {
    return this.getDiscoveryOptions().products;
  }

  public getStages(): string[] {
    return this.getDiscoveryOptions().stages;
  }

  public getPriorities(): string[] {
    return this.getDiscoveryOptions().priorities;
  }

  public getExistingTools(): string[] {
    return this.getDiscoveryOptions().existingTools;
  }

  public getLeadSignals(): { hireIq: string[]; hrms: string[] } {
    return this.getDiscoveryOptions().leadSignals;
  }
}
