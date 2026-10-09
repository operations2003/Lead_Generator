import { extractDomain, normalizeName } from './companyService';

export interface DiscoveredCompanyCandidate {
  name: string;
  normalizedName: string;
  category: string;
  location: string;
  website: string;
  domain: string;
  phone?: string;
  address?: string;
  source: string;
  sourceUrls?: string[];
}

export interface DiscoverySearchCriteria {
  category: string;
  location: string;
  maxResults?: number;
  page?: number;
}

const DIRECTORY_DOMAINS = new Set([
  'duckduckgo.com',
  'google.com',
  'bing.com',
  'yahoo.com',
  'linkedin.com',
  'facebook.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'youtube.com',
  'yelp.com',
  'yellowpages.com',
  'clutch.co',
  'goodfirms.co',
  'upwork.com',
  'fiverr.com',
  'glassdoor.com',
  'indeed.com',
  'wikipedia.org',
  'wikidata.org',
  'f6s.com',
  'g2.com',
  'capterra.com',
  'trustpilot.com',
  'expertise.com',
  'topdevelopers.co',
  'themanifest.com',
  'builtin.com',
  'crunchbase.com',
  'zoominfo.com',
  'apollo.io',
  'bbb.org',
  'mapquest.com',
  'tripadvisor.com',
  'angi.com',
  'thumbtack.com',
  'bark.com',
  'reddit.com',
  'medium.com',
  'quora.com',
  'github.com',
]);

export class CompanyDiscoveryEngine {
  private lastNominatimRequestTime = 0;

  /**
   * Main Stage A entrypoint: executes multi-source legitimate company discovery.
   */
  public async discoverCompanies(
    criteria: DiscoverySearchCriteria,
    onProgress?: (message: string, currentCount: number) => void
  ): Promise<DiscoveredCompanyCandidate[]> {
    const { category, location } = criteria;
    const maxResults = Math.min(Math.max(criteria.maxResults || 10, 1), 50);

    onProgress?.(`Starting discovery for "${category}" in "${location}"...`, 0);

    const candidates: DiscoveredCompanyCandidate[] = [];
    const seenDomains = new Set<string>();
    const seenNames = new Set<string>();

    const addCandidate = (item: DiscoveredCompanyCandidate): boolean => {
      if (!item.website || !item.domain) return false;
      if (DIRECTORY_DOMAINS.has(item.domain) || Array.from(DIRECTORY_DOMAINS).some((d) => item.domain.endsWith('.' + d))) {
        return false;
      }
      if (seenDomains.has(item.domain) || seenNames.has(item.normalizedName)) {
        return false;
      }
      seenDomains.add(item.domain);
      seenNames.add(item.normalizedName);
      candidates.push(item);
      return true;
    };

    // 1. Source A: OpenStreetMap Nominatim Business Directory (legitimate, open, real establishments)
    try {
      onProgress?.(`Querying OpenStreetMap business registry...`, candidates.length);
      const osmResults = await this.queryNominatim(category, location, maxResults);
      for (const item of osmResults) {
        if (addCandidate(item) && candidates.length >= maxResults) {
          onProgress?.(`Found ${candidates.length} candidate companies`, candidates.length);
          return candidates.slice(0, maxResults);
        }
      }
    } catch (err) {
      console.warn('Nominatim discovery warning:', (err as Error).message);
    }

    // 2. Source B: Wikipedia / Wikidata Open Business & Corporate Knowledge Base
    if (candidates.length < maxResults) {
      try {
        onProgress?.(`Querying Wikipedia / Wikidata business registry...`, candidates.length);
        const wikiResults = await this.queryWikipedia(category, location, maxResults - candidates.length);
        for (const item of wikiResults) {
          if (addCandidate(item) && candidates.length >= maxResults) {
            onProgress?.(`Found ${candidates.length} candidate companies`, candidates.length);
            return candidates.slice(0, maxResults);
          }
        }
      } catch (err) {
        console.warn('Wikipedia discovery warning:', (err as Error).message);
      }
    }

    // 3. Source C: Organic Public Web Discovery Engine (searches public business listings & decodes company sites)
    if (candidates.length < maxResults) {
      try {
        onProgress?.(`Querying organic web business search...`, candidates.length);
        const webResults = await this.queryOrganicWeb(category, location, (maxResults - candidates.length) * 2);
        for (const item of webResults) {
          if (addCandidate(item) && candidates.length >= maxResults) {
            break;
          }
        }
      } catch (err) {
        console.warn('Organic web discovery warning:', (err as Error).message);
      }
    }

    onProgress?.(`Stage A discovery complete. Discovered ${candidates.length} legitimate companies.`, candidates.length);
    return candidates.slice(0, maxResults);
  }

  /**
   * Queries OpenStreetMap Nominatim for real registered places, offices, and establishments.
   */
  private async queryNominatim(
    category: string,
    location: string,
    limit: number
  ): Promise<DiscoveredCompanyCandidate[]> {
    // Respect Nominatim rate limit: max 1 request per second
    const now = Date.now();
    const elapsed = now - this.lastNominatimRequestTime;
    if (elapsed < 1100) {
      await new Promise((r) => setTimeout(r, 1100 - elapsed));
    }
    this.lastNominatimRequestTime = Date.now();

    const query = `${category} in ${location}`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=jsonv2&addressdetails=1&extratags=1&limit=${Math.min(limit * 2, 25)}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LeadGenerator-DiscoveryBot/1.0 (contact@leadgen.local; legitimate discovery)',
        Accept: 'application/json',
      },
    });

    if (!response.ok) return [];

    const data = (await response.json()) as Array<{
      name?: string;
      display_name: string;
      extratags?: Record<string, string>;
      address?: Record<string, string>;
    }>;

    if (!Array.isArray(data)) return [];

    const results: DiscoveredCompanyCandidate[] = [];

    for (const item of data) {
      const rawName = item.name || item.display_name.split(',')[0].trim();
      const website = item.extratags?.website || item.extratags?.['contact:website'] || item.extratags?.['brand:website'];
      const phone = item.extratags?.phone || item.extratags?.['contact:phone'];

      // Build readable physical street address
      const addrParts: string[] = [];
      if (item.address?.house_number && item.address?.road) {
        addrParts.push(`${item.address.house_number} ${item.address.road}`);
      } else if (item.address?.road) {
        addrParts.push(item.address.road);
      }
      const city = item.address?.city || item.address?.town || item.address?.suburb || item.address?.county;
      if (city) addrParts.push(city);
      if (item.address?.state) addrParts.push(item.address.state);
      if (item.address?.postcode) addrParts.push(item.address.postcode);
      if (item.address?.country) addrParts.push(item.address.country);

      const address = addrParts.length > 0 ? addrParts.join(', ') : item.display_name;

      if (website) {
        const domain = extractDomain(website);
        if (domain) {
          results.push({
            name: rawName,
            normalizedName: normalizeName(rawName),
            category,
            location,
            website: website.startsWith('http') ? website : `https://${website}`,
            domain,
            phone,
            address,
            source: 'OpenStreetMap Business Registry',
            sourceUrls: [url],
          });
        }
      }
    }

    return results;
  }

  /**
   * Queries Wikipedia / Wikidata Open API for corporations and registered firms.
   */
  private async queryWikipedia(
    category: string,
    location: string,
    limit: number
  ): Promise<DiscoveredCompanyCandidate[]> {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      `${category} companies in ${location}`
    )}&format=json&utf8=1`;

    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'LeadGenerator-DiscoveryBot/1.0 (contact@leadgen.local)',
        Accept: 'application/json',
      },
    });

    if (!res.ok) return [];

    const json = (await res.json()) as {
      query?: { search?: Array<{ title: string; snippet: string }> };
    };

    const searchHits = json.query?.search || [];
    const results: DiscoveredCompanyCandidate[] = [];

    for (const hit of searchHits.slice(0, Math.min(limit * 2, 8))) {
      const title = hit.title;
      // Skip disambiguation or list pages
      if (title.toLowerCase().startsWith('list of') || title.toLowerCase().includes('disambiguation')) {
        continue;
      }

      try {
        const pageUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extlinks|pageprops&titles=${encodeURIComponent(
          title
        )}&format=json&utf8=1`;
        const pageRes = await fetch(pageUrl, {
          headers: { 'User-Agent': 'LeadGenerator-DiscoveryBot/1.0' },
        });

        if (!pageRes.ok) continue;

        const pageData = (await pageRes.json()) as {
          query?: {
            pages?: Record<
              string,
              {
                extlinks?: Array<{ '*': string }>;
                pageprops?: { wikibase_item?: string };
              }
            >;
          };
        };

        const pages = pageData.query?.pages || {};
        const page = Object.values(pages)[0];
        if (!page) continue;

        let officialWebsite = '';

        // Check Wikidata entity claims if available (P856 = official website)
        if (page.pageprops?.wikibase_item) {
          try {
            const wdUrl = `https://www.wikidata.org/wiki/Special:EntityData/${page.pageprops.wikibase_item}.json`;
            const wdRes = await fetch(wdUrl, {
              headers: { 'User-Agent': 'LeadGenerator-DiscoveryBot/1.0' },
            });
            if (wdRes.ok) {
              const wdData = (await wdRes.json()) as {
                entities?: Record<string, { claims?: { P856?: Array<{ mainsnak?: { datavalue?: { value?: string } } }> } }>;
              };
              const entity = wdData.entities?.[page.pageprops.wikibase_item];
              const p856 = entity?.claims?.P856?.[0]?.mainsnak?.datavalue?.value;
              if (p856 && typeof p856 === 'string') {
                officialWebsite = p856;
              }
            }
          } catch {}
        }

        // If not in Wikidata, look for external links
        if (!officialWebsite && page.extlinks && page.extlinks.length > 0) {
          for (const link of page.extlinks) {
            const linkUrl = link['*'];
            const domain = extractDomain(linkUrl);
            if (domain && !DIRECTORY_DOMAINS.has(domain) && !domain.includes('wikipedia') && !domain.includes('govtech') && !domain.includes('archive')) {
              officialWebsite = linkUrl;
              break;
            }
          }
        }

        if (officialWebsite) {
          const domain = extractDomain(officialWebsite);
          if (domain) {
            results.push({
              name: title,
              normalizedName: normalizeName(title),
              category,
              location,
              website: officialWebsite.startsWith('http') ? officialWebsite : `https://${officialWebsite}`,
              domain,
              source: 'Wikipedia & Wikidata Knowledge Registry',
              sourceUrls: [`https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`],
            });
          }
        }
      } catch {}
    }

    return results;
  }

  /**
   * Organic public web discovery:
   * Parses public search engine results to find official company websites,
   * filtering out all directory aggregators (Clutch, Yelp, etc.).
   */
  private async queryOrganicWeb(
    category: string,
    location: string,
    limit: number
  ): Promise<DiscoveredCompanyCandidate[]> {
    const queries = [
      `${category} in ${location} official website`,
      `${category} firms ${location}`,
    ];

    const results: DiscoveredCompanyCandidate[] = [];

    for (const q of queries) {
      try {
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
        const res = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 LeadGenDiscovery/1.0',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });

        if (!res.ok) continue;

        const html = await res.text();
        const regex = /<a[^>]*class="result__a"[^>]*href="[^"]*uddg=([^&"]+)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
        let match;

        while ((match = regex.exec(html)) !== null && results.length < limit) {
          const rawUrl = decodeURIComponent(match[1]);
          const rawTitle = match[2].replace(/<[^>]+>/g, '').trim();

          const domain = extractDomain(rawUrl);
          if (
            !domain ||
            DIRECTORY_DOMAINS.has(domain) ||
            Array.from(DIRECTORY_DOMAINS).some((d) => domain.endsWith('.' + d))
          ) {
            continue;
          }

          // Clean title to extract pure company name
          let compName = rawTitle.split(/[-|:–—]/)[0].trim();
          if (
            !compName ||
            compName.length > 50 ||
            compName.toLowerCase().includes('top ') ||
            compName.toLowerCase().includes('best ') ||
            compName.toLowerCase().includes('reviews')
          ) {
            const domainFirst = domain.split('.')[0];
            compName = domainFirst.charAt(0).toUpperCase() + domainFirst.slice(1);
          }

          if (!results.some((r) => r.domain === domain)) {
            results.push({
              name: compName,
              normalizedName: normalizeName(compName),
              category,
              location,
              website: `https://${domain}`,
              domain,
              source: 'Organic Web Search Discovery',
              sourceUrls: [rawUrl],
            });
          }
        }
      } catch {}

      if (results.length >= limit) break;
    }

    return results;
  }
}

export const companyDiscoveryEngine = new CompanyDiscoveryEngine();
