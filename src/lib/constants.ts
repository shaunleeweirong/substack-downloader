// Match: subdomain.substack.com OR substack.com/@username
export const SUBSTACK_URL_PATTERN = /^https?:\/\/(?:([a-zA-Z0-9-]+)\.substack\.com|substack\.com\/@([a-zA-Z0-9_]+))\/?(?:\?.*)?$/;

export const RATE_LIMIT_DELAY_MS = 1000; // 1 second between requests

export const MAX_CONCURRENT_IMAGE_DOWNLOADS = 5;

export const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export const SUPPORTED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

export const DEFAULT_IMAGE_EXTENSION = 'jpg';
