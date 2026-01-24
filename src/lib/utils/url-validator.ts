import { z } from 'zod';
import { SUBSTACK_URL_PATTERN } from '../constants';

export const substackUrlSchema = z.string().url().refine(
  (url) => SUBSTACK_URL_PATTERN.test(url),
  { message: 'Please enter a valid Substack URL (e.g., https://example.substack.com)' }
);

/**
 * Check if URL is a substack.com domain (subdomain.substack.com or substack.com/@username)
 */
export function isSubstackDomain(url: string): boolean {
  return SUBSTACK_URL_PATTERN.test(url);
}

/**
 * Validate any https URL
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extract subdomain from substack.com URL
 */
export function extractSubdomain(url: string): string | null {
  const match = url.match(SUBSTACK_URL_PATTERN);
  if (!match) return null;
  // match[1] = subdomain format, match[2] = profile format
  return match[1] || match[2] || null;
}

/**
 * Extract identifier from URL
 * For substack.com URLs → returns subdomain
 * For custom domains → returns domain name (without www)
 */
export function extractIdentifier(url: string): string | null {
  if (isSubstackDomain(url)) {
    return extractSubdomain(url);
  }
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// Keep for backwards compatibility
export function isValidSubstackUrl(url: string): boolean {
  return SUBSTACK_URL_PATTERN.test(url);
}

export function normalizeUrl(url: string): string {
  // Remove trailing slash and ensure https
  let normalized = url.trim().replace(/\/+$/, '');
  if (normalized.startsWith('http://')) {
    normalized = normalized.replace('http://', 'https://');
  }
  return normalized;
}

// Alias for backwards compatibility
export const normalizeSubstackUrl = normalizeUrl;
