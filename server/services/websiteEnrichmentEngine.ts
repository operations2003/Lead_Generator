import { safeFetch } from '../utils/ssrfProtection';
import {
  DiscoveredContactEmail,
  DiscoveredContactPhone,
  ExtractionStatus,
} from '../db/types';
import { DiscoveredCompanyCandidate } from './companyDiscoveryEngine';

export interface EnrichedCompanyLead {
  companyName: string;
  normalizedName: string;
  category: string;
  location: string;
  website: string;
  domain: string;
  emails: DiscoveredContactEmail[];
  phones: DiscoveredContactPhone[];
  address: string | null;
  addressSourceUrl: string | null;
  sourceUrls: string[];
  extractionStatus: ExtractionStatus;
  extractionError: string | null;
}

export class WebsiteEnrichmentEngine {
  /**
   * Main Stage B entrypoint: processes a list of discovered company candidates,
   * inspects their official websites, and extracts contacts with SSRF protection.
   */
  public async enrichCompanies(
    candidates: DiscoveredCompanyCandidate[],
    onProgress?: (companyName: string, index: number, total: number, status: ExtractionStatus) => void
  ): Promise<EnrichedCompanyLead[]> {
    const results: EnrichedCompanyLead[] = [];

    // Process in controlled batches of 3 companies at a time to prevent socket exhaustion
    const BATCH_SIZE = 3;
    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const batch = candidates.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map((cand, idx) =>
        this.enrichSingleCompany(cand).then((enriched) => {
          onProgress?.(cand.name, i + idx + 1, candidates.length, enriched.extractionStatus);
          return enriched;
        })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Enriches a single company website:
   * 1. Inspects homepage
   * 2. Finds contact/about subpages
   * 3. Extracts emails, phone numbers, addresses, and preserves source URLs
   */
  public async enrichSingleCompany(candidate: DiscoveredCompanyCandidate): Promise<EnrichedCompanyLead> {
    const visitedUrls: string[] = [];
    const allEmails: DiscoveredContactEmail[] = [];
    const allPhones: DiscoveredContactPhone[] = [];
    let physicalAddress: string | null = candidate.address || null;
    let addressSourceUrl: string | null = candidate.sourceUrls?.[0] || null;
    let extractionStatus: ExtractionStatus = 'pending';
    let extractionError: string | null = null;

    try {
      // 1. Visit homepage
      const homepageResult = await safeFetch(candidate.website, { timeoutMs: 8000 });
      visitedUrls.push(homepageResult.url);

      // Extract from homepage
      const homeContacts = this.extractFromHtml(
        homepageResult.html,
        homepageResult.url,
        candidate.domain
      );

      this.mergeContacts(allEmails, homeContacts.emails);
      this.mergePhones(allPhones, homeContacts.phones);

      if (homeContacts.address) {
        physicalAddress = homeContacts.address;
        addressSourceUrl = homepageResult.url;
      }

      // 2. Discover relevant subpages (Contact Us, About Us)
      const subpageUrls = this.findRelevantInternalLinks(
        homepageResult.html,
        homepageResult.url,
        candidate.domain
      );

      // 3. Inspect discovered subpages (limit to top 2 subpages)
      for (const subUrl of subpageUrls.slice(0, 2)) {
        if (visitedUrls.includes(subUrl)) continue;
        try {
          // Small courtesy pause between requests to the same host
          await new Promise((r) => setTimeout(r, 200));

          const subResult = await safeFetch(subUrl, { timeoutMs: 8000 });
          visitedUrls.push(subResult.url);

          const subContacts = this.extractFromHtml(
            subResult.html,
            subResult.url,
            candidate.domain
          );

          this.mergeContacts(allEmails, subContacts.emails);
          this.mergePhones(allPhones, subContacts.phones);

          if (subContacts.address && !physicalAddress) {
            physicalAddress = subContacts.address;
            addressSourceUrl = subResult.url;
          }
        } catch {
          // Subpage failure is non-fatal for overall enrichment
        }
      }

      // 4. Determine final status
      if (allEmails.length > 0 || allPhones.length > 0) {
        extractionStatus = 'completed';
      } else {
        extractionStatus = 'no_contacts';
      }
    } catch (err) {
      // Failed to reach website or blocked by SSRF
      extractionStatus = 'website_unavailable';
      extractionError = (err as Error).message;
    }

    // Merge any phone from Stage A if not found on website
    if (candidate.phone && allPhones.length === 0) {
      allPhones.push({
        phone: candidate.phone,
        type: 'office',
        status: 'found',
        sourceUrl: candidate.sourceUrls?.[0] || candidate.website,
      });
      if (extractionStatus === 'no_contacts') {
        extractionStatus = 'completed';
      }
    }

    return {
      companyName: candidate.name,
      normalizedName: candidate.normalizedName,
      category: candidate.category,
      location: candidate.location,
      website: candidate.website,
      domain: candidate.domain,
      emails: allEmails,
      phones: allPhones,
      address: physicalAddress,
      addressSourceUrl,
      sourceUrls: visitedUrls.length > 0 ? visitedUrls : (candidate.sourceUrls || [candidate.website]),
      extractionStatus,
      extractionError,
    };
  }

  /**
   * Extracts emails, phones, and address from an HTML document.
   */
  private extractFromHtml(
    html: string,
    pageUrl: string,
    companyDomain: string
  ): {
    emails: DiscoveredContactEmail[];
    phones: DiscoveredContactPhone[];
    address: string | null;
  } {
    const emails: DiscoveredContactEmail[] = [];
    const phones: DiscoveredContactPhone[] = [];
    let address: string | null = null;

    // 1. Mailto links (verified confidence)
    const mailtoRegex = /href=["']mailto:([^"?'>\s]+)[^"']*["']/gi;
    let mMatch;
    while ((mMatch = mailtoRegex.exec(html)) !== null) {
      const rawEmail = mMatch[1].trim().toLowerCase();
      if (this.isValidEmail(rawEmail)) {
        emails.push({
          email: rawEmail,
          type: this.categorizeEmail(rawEmail),
          status: rawEmail.endsWith('@' + companyDomain) ? 'verified' : 'syntax_valid',
          sourceUrl: pageUrl,
        });
      }
    }

    // 2. Body text emails
    const textEmailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
    let eMatch;
    while ((eMatch = textEmailRegex.exec(html)) !== null) {
      const rawEmail = eMatch[0].trim().toLowerCase();
      if (this.isValidEmail(rawEmail) && !emails.some((e) => e.email === rawEmail)) {
        emails.push({
          email: rawEmail,
          type: this.categorizeEmail(rawEmail),
          status: rawEmail.endsWith('@' + companyDomain) ? 'verified' : 'syntax_valid',
          sourceUrl: pageUrl,
        });
      }
    }

    // 3. Tel links (verified confidence)
    const telRegex = /href=["']tel:([^"'>\s]+)["']/gi;
    let tMatch;
    while ((tMatch = telRegex.exec(html)) !== null) {
      const rawTel = tMatch[1].trim();
      const cleaned = this.cleanPhone(rawTel);
      if (cleaned && !phones.some((p) => p.phone === cleaned)) {
        phones.push({
          phone: cleaned,
          type: 'office',
          status: 'verified',
          sourceUrl: pageUrl,
        });
      }
    }

    // 4. Formatted phone numbers in text
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
    let pMatch;
    while ((pMatch = phoneRegex.exec(html)) !== null) {
      const raw = pMatch[0].trim();
      const cleaned = this.cleanPhone(raw);
      if (cleaned && !phones.some((p) => p.phone === cleaned)) {
        phones.push({
          phone: cleaned,
          type: 'general',
          status: 'found',
          sourceUrl: pageUrl,
        });
      }
    }

    // 5. Postal Address in <address> tag or Schema.org
    const addressTagRegex = /<address[^>]*>([\s\S]*?)<\/address>/gi;
    const aMatch = addressTagRegex.exec(html);
    if (aMatch) {
      const cleanAddr = aMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanAddr.length > 10 && cleanAddr.length < 250) {
        address = cleanAddr;
      }
    }

    return { emails, phones, address };
  }

  /**
   * Discovers internal links from HTML matching Contact or About pages.
   */
  private findRelevantInternalLinks(
    html: string,
    baseUrl: string,
    companyDomain: string
  ): string[] {
    const discoveredLinks: string[] = [];
    const linkRegex = /<a[^>]*href=["']([^"'>\s#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;

    const contactKeywords = /contact|about|touch|reach|connect|location|directions|support|team/i;

    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1].trim();
      const text = match[2].replace(/<[^>]+>/g, '').trim();

      if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
        continue;
      }

      if (contactKeywords.test(href) || contactKeywords.test(text)) {
        try {
          const resolved = new URL(href, baseUrl);
          // Only stay within the same company domain (or subdomains)
          const resolvedHost = resolved.hostname.replace(/^www\./i, '').toLowerCase();
          if (resolvedHost === companyDomain || resolvedHost.endsWith('.' + companyDomain)) {
            const cleanUrl = resolved.origin + resolved.pathname;
            if (!discoveredLinks.includes(cleanUrl) && cleanUrl !== baseUrl) {
              discoveredLinks.push(cleanUrl);
            }
          }
        } catch {}
      }

      if (discoveredLinks.length >= 6) break;
    }

    return discoveredLinks;
  }

  private isValidEmail(email: string): boolean {
    if (!email || email.length < 6 || email.length > 100) return false;
    if (email.includes('..') || email.startsWith('.')) return false;
    if (/\.(png|jpg|jpeg|gif|svg|webp|css|js|woff|woff2|ttf)$/i.test(email)) return false;

    const domain = email.split('@')[1];
    if (!domain || domain.indexOf('.') === -1) return false;

    const junkDomains = new Set([
      'example.com',
      'domain.com',
      'test.com',
      'email.com',
      'sentry.io',
      'w3.org',
      'schema.org',
      'cloudflare.com',
      'wixpress.com',
      'wordpress.org',
      'gravatar.com',
    ]);

    return !junkDomains.has(domain);
  }

  private cleanPhone(raw: string): string | null {
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) return null;
    // Reject years (1900-2099) or zip codes mistaken for phones
    if (digits.length === 8 && (digits.startsWith('19') || digits.startsWith('20'))) return null;
    return raw.replace(/[^0-9+() -]/g, '').trim();
  }

  private categorizeEmail(email: string): string {
    const local = email.split('@')[0].toLowerCase();
    if (/info|contact|office|enquir|hello|mail/i.test(local)) return 'general';
    if (/sales|biz|commercial/i.test(local)) return 'sales';
    if (/support|help|service/i.test(local)) return 'support';
    if (/press|media/i.test(local)) return 'media';
    if (/career|job|hr|recruiting/i.test(local)) return 'recruiting';
    return 'direct';
  }

  private mergeContacts(target: DiscoveredContactEmail[], incoming: DiscoveredContactEmail[]): void {
    for (const inc of incoming) {
      const existing = target.find((t) => t.email === inc.email);
      if (!existing) {
        target.push(inc);
      } else if (inc.status === 'verified' && existing.status !== 'verified') {
        existing.status = 'verified';
        existing.sourceUrl = inc.sourceUrl;
      }
    }
  }

  private mergePhones(target: DiscoveredContactPhone[], incoming: DiscoveredContactPhone[]): void {
    for (const inc of incoming) {
      const incDigits = inc.phone.replace(/\D/g, '');
      const existing = target.find((t) => t.phone.replace(/\D/g, '') === incDigits);
      if (!existing) {
        target.push(inc);
      } else if (inc.status === 'verified' && existing.status !== 'verified') {
        existing.status = 'verified';
        existing.sourceUrl = inc.sourceUrl;
      }
    }
  }
}

export const websiteEnrichmentEngine = new WebsiteEnrichmentEngine();
