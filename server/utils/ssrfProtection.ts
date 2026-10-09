import dns from 'node:dns/promises';
import net from 'node:net';

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxRedirects?: number;
  maxBytes?: number;
  headers?: Record<string, string>;
}

export interface SafeFetchResult {
  url: string;
  status: number;
  html: string;
  headers: Headers;
}

/**
 * Checks if an IP address belongs to loopback, private, link-local, or cloud metadata ranges.
 */
export function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  const trimmed = ip.trim();

  // IPv4 checks
  if (net.isIPv4(trimmed)) {
    const parts = trimmed.split('.').map(Number);
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true; // invalid IP
    }

    // 0.0.0.0/8 (Current network)
    if (parts[0] === 0) return true;

    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;

    // 10.0.0.0/8 (Private network)
    if (parts[0] === 10) return true;

    // 100.64.0.0/10 (Shared address / Carrier-grade NAT)
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;

    // 169.254.0.0/16 (Link-local & Cloud Metadata 169.254.169.254)
    if (parts[0] === 169 && parts[1] === 254) return true;

    // 172.16.0.0/12 (Private network 172.16 - 172.31)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

    // 192.168.0.0/16 (Private network)
    if (parts[0] === 192 && parts[1] === 168) return true;

    // 198.18.0.0/15 (Benchmarking)
    if (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) return true;

    // 224.0.0.0/4 (Multicast)
    if (parts[0] >= 224 && parts[0] <= 239) return true;

    // 240.0.0.0/4 (Reserved)
    if (parts[0] >= 240) return true;

    return false;
  }

  // IPv6 checks
  if (net.isIPv6(trimmed)) {
    const lower = trimmed.toLowerCase();

    // ::1 (Loopback) or :: (Unspecified)
    if (lower === '::1' || lower === '::' || lower === '0000:0000:0000:0000:0000:0000:0000:0001') {
      return true;
    }

    // IPv4-mapped IPv6 (::ffff:192.168.1.1)
    if (lower.startsWith('::ffff:')) {
      const ipv4Part = lower.substring(7);
      if (net.isIPv4(ipv4Part)) {
        return isPrivateIp(ipv4Part);
      }
    }

    // Unique local address (fc00::/7 -> fc.. or fd..)
    if (lower.startsWith('fc') || lower.startsWith('fd')) {
      return true;
    }

    // Link-local address (fe80::/10)
    if (
      lower.startsWith('fe8') ||
      lower.startsWith('fe9') ||
      lower.startsWith('fea') ||
      lower.startsWith('feb')
    ) {
      return true;
    }

    return false;
  }

  return true;
}

/**
 * Validates a target URL against SSRF vulnerabilities:
 * - Scheme must be strictly HTTP or HTTPS
 * - Rejects reserved and local hostnames
 * - Resolves hostname and verifies that NO IP is in private or link-local ranges
 */
export async function validateUrlForSsrf(targetUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl.trim());
  } catch {
    throw new Error(`Invalid URL format: "${targetUrl}"`);
  }

  // Protocol validation
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`SSRF blocked: Unsupported or prohibited protocol "${parsed.protocol}"`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // Hostname blocklist
  const blockedHostnames = new Set([
    'localhost',
    'localhost.localdomain',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    'metadata.google.internal',
    'instance-data',
  ]);

  if (
    blockedHostnames.has(hostname) ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.lan')
  ) {
    throw new Error(`SSRF blocked: Prohibited host "${hostname}"`);
  }

  // If hostname is directly an IP address
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error(`SSRF blocked: Destination IP "${hostname}" is private, loopback, or metadata`);
    }
    return parsed;
  }

  // Resolve hostname via DNS
  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch (dnsErr) {
    throw new Error(`DNS resolution failed for host "${hostname}": ${(dnsErr as Error).message}`);
  }

  if (!addresses || addresses.length === 0) {
    throw new Error(`No IP addresses found for host "${hostname}"`);
  }

  // Check every resolved address
  for (const record of addresses) {
    if (isPrivateIp(record.address)) {
      throw new Error(
        `SSRF blocked: Domain "${hostname}" resolves to restricted IP "${record.address}"`
      );
    }
  }

  return parsed;
}

/**
 * Performs a secure, SSRF-protected HTTP GET request.
 * - Re-validates redirects against SSRF guards before following
 * - Limits maximum redirects
 * - Implements timeout via AbortSignal
 * - Caps maximum payload bytes to prevent memory attacks
 */
export async function safeFetch(
  targetUrl: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const maxRedirects = options.maxRedirects ?? 3;
  const maxBytes = options.maxBytes ?? 1500000; // 1.5 MB

  let currentUrl = targetUrl;
  let redirectCount = 0;

  const defaultHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (LeadGenerator; Contact Enrichment)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    ...options.headers,
  };

  while (redirectCount <= maxRedirects) {
    // 1. SSRF check for current URL
    await validateUrlForSsrf(currentUrl);

    // 2. Fetch with AbortController timeout
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: 'manual', // Never let node fetch follow redirects unchecked
        headers: defaultHeaders,
      });

      clearTimeout(timer);

      // 3. Handle Redirects (301, 302, 303, 307, 308)
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          throw new Error(`Redirect from ${currentUrl} did not provide a Location header`);
        }

        const nextUrl = new URL(location, currentUrl).toString();
        redirectCount++;
        currentUrl = nextUrl;
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status} (${response.statusText}) from ${currentUrl}`);
      }

      // 4. Safely read response text with byte limit
      const reader = response.body?.getReader();
      if (!reader) {
        const html = await response.text();
        return {
          url: currentUrl,
          status: response.status,
          html: html.slice(0, maxBytes),
          headers: response.headers,
        };
      }

      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.length;
          chunks.push(value);
          if (totalBytes >= maxBytes) {
            reader.cancel().catch(() => {});
            break;
          }
        }
      }

      const combined = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      const decoder = new TextDecoder('utf-8', { fatal: false });
      const html = decoder.decode(combined);

      return {
        url: currentUrl,
        status: response.status,
        html,
        headers: response.headers,
      };
    } catch (err: unknown) {
      clearTimeout(timer);
      const error = err as Error;
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs}ms for ${currentUrl}`);
      }
      throw err;
    }
  }

  throw new Error(`Exceeded maximum redirect limit of ${maxRedirects} for ${targetUrl}`);
}
