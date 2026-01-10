import { z } from 'zod';
import { SUBSTACK_URL_PATTERN } from '../constants';

export const substackUrlSchema = z.string().url().refine(
  (url) => SUBSTACK_URL_PATTERN.test(url),
  { message: 'Please enter a valid Substack URL (e.g., https://example.substack.com)' }
);

export function extractSubdomain(url: string): string | null {
  const match = url.match(SUBSTACK_URL_PATTERN);
  if (!match) return null;
  // match[1] = subdomain format, match[2] = profile format
  return match[1] || match[2] || null;
}

export function isValidSubstackUrl(url: string): boolean {
  return SUBSTACK_URL_PATTERN.test(url);
}

export function normalizeSubstackUrl(url: string): string {
  // Remove trailing slash and ensure https
  let normalized = url.trim().replace(/\/+$/, '');
  if (normalized.startsWith('http://')) {
    normalized = normalized.replace('http://', 'https://');
  }
  return normalized;
}
