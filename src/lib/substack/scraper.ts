import * as cheerio from 'cheerio';
import { SubstackPost, SubstackPublication } from './types';
import { RateLimiter } from '../utils/rate-limiter';
import { USER_AGENT } from '../constants';
import { generateSlug } from '../utils/slug';

const rateLimiter = new RateLimiter();

interface PostListItem {
  url: string;
  slug: string;
  title: string;
  publishedAt: string;
  isPaid: boolean;
}

interface DateRange {
  startDate: string | null;
  endDate: string | null;
}

/**
 * Resolves the actual base URL for a Substack publication by following redirects.
 * Some publications have custom domains or redirect to profile URLs.
 * If redirected to a profile page, extracts the custom domain from page content.
 */
async function resolveBaseUrl(subdomain: string): Promise<string> {
  const initialUrl = `https://${subdomain}.substack.com`;

  try {
    // Follow redirects to get the final URL and page content
    const response = await fetch(initialUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT },
    });

    const finalUrl = response.url;
    const url = new URL(finalUrl);

    // If redirected to a profile page (substack.com/@username), look for custom domain
    if (url.host === 'substack.com' && url.pathname.startsWith('/@')) {
      const html = await response.text();

      // Look for custom domain that contains the subdomain name
      // e.g., for subdomain "compoundingquality", find "compoundingquality.net"
      const customDomainRegex = new RegExp(
        `https?://(www\\.)?([a-zA-Z0-9-]*${subdomain}[a-zA-Z0-9-]*\\.[a-z]{2,})`,
        'i'
      );
      const customDomainMatch = html.match(customDomainRegex);

      if (customDomainMatch) {
        const customDomain = customDomainMatch[2];
        const customBaseUrl = `https://${customDomainMatch[1] || ''}${customDomain}`;
        // Verify this URL has a working API
        try {
          const testResponse = await fetch(`${customBaseUrl}/api/v1/archive?limit=1`, {
            headers: { 'User-Agent': USER_AGENT },
          });
          const contentType = testResponse.headers.get('content-type') || '';
          if (testResponse.ok && contentType.includes('application/json')) {
            return customBaseUrl;
          }
        } catch {
          // Custom domain API doesn't work, fall through
        }
      }

      // No custom domain found or it didn't work, try the subdomain directly
      // Some profile pages still have working subdomain APIs
      try {
        const testResponse = await fetch(`${initialUrl}/api/v1/archive?limit=1`, {
          headers: { 'User-Agent': USER_AGENT },
        });
        const contentType = testResponse.headers.get('content-type') || '';
        if (testResponse.ok && contentType.includes('application/json')) {
          return initialUrl;
        }
      } catch {
        // Subdomain API doesn't work either
      }

      // Return the profile URL as last resort (will likely fail, but provides better error)
      return `${url.protocol}//${url.host}`;
    }

    // Not a profile redirect, use the final URL
    return `${url.protocol}//${url.host}`;
  } catch {
    // If resolution fails, return the original URL
    return initialUrl;
  }
}

export async function fetchPublicationInfo(subdomain: string): Promise<SubstackPublication> {
  // First, resolve the actual base URL (handles custom domains and redirects)
  const baseUrl = await resolveBaseUrl(subdomain);
  const initialUrl = `https://${subdomain}.substack.com`;

  const response = await rateLimiter.fetch(baseUrl, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch publication: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Extract publication info from meta tags and page content
  const name = $('meta[property="og:site_name"]').attr('content') ||
               $('title').text().split('|')[0]?.trim() ||
               subdomain;

  const description = $('meta[property="og:description"]').attr('content') ||
                      $('meta[name="description"]').attr('content') || '';

  const author = $('meta[name="author"]').attr('content') || '';

  // Check for paid content indicators
  const hasPaidContent = html.includes('subscription') ||
                         html.includes('subscribe') ||
                         $('[data-component-name="SubscribeWidget"]').length > 0;

  return {
    name,
    subdomain,
    description,
    author,
    url: initialUrl,
    baseUrl, // The actual URL to use for API calls
    hasPaidContent,
  };
}

export async function fetchArchivePostList(baseUrl: string): Promise<PostListItem[]> {
  const posts: PostListItem[] = [];
  let offset = 0;
  const limit = 12;
  let hasMore = true;

  while (hasMore) {
    const archiveUrl = `${baseUrl}/api/v1/archive?sort=new&search=&offset=${offset}&limit=${limit}`;

    const response = await rateLimiter.fetch(archiveUrl, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!response.ok) {
      // Try fallback to HTML scraping if API fails
      if (offset === 0) {
        return await fetchArchiveFromHtml(baseUrl);
      }
      break;
    }

    // Check if response is JSON (not a redirect HTML page)
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      if (offset === 0) {
        return await fetchArchiveFromHtml(baseUrl);
      }
      break;
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      hasMore = false;
      break;
    }

    for (const post of data) {
      posts.push({
        url: post.canonical_url || `${baseUrl}/p/${post.slug}`,
        slug: post.slug,
        title: post.title,
        publishedAt: post.post_date,
        isPaid: post.audience === 'only_paid' || post.is_paid,
      });
    }

    offset += limit;

    if (data.length < limit) {
      hasMore = false;
    }
  }

  return posts;
}

async function fetchArchiveFromHtml(baseUrl: string): Promise<PostListItem[]> {
  const posts: PostListItem[] = [];
  const archiveUrl = `${baseUrl}/archive`;

  const response = await rateLimiter.fetch(archiveUrl, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch archive: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Find post links in the archive
  $('a[data-testid="post-preview-title"]').each((_, element) => {
    const href = $(element).attr('href');
    const title = $(element).text().trim();

    if (href && title) {
      const slug = href.split('/p/')[1]?.split('?')[0] || generateSlug(title);
      posts.push({
        url: href.startsWith('http') ? href : `${baseUrl}${href}`,
        slug,
        title,
        publishedAt: new Date().toISOString(), // Will be updated when fetching full post
        isPaid: false,
      });
    }
  });

  // Alternative selector for different page structures
  if (posts.length === 0) {
    $('.post-preview').each((_, element) => {
      const link = $(element).find('a').first();
      const href = link.attr('href');
      const title = link.text().trim();

      if (href && title) {
        const slug = href.split('/p/')[1]?.split('?')[0] || generateSlug(title);
        posts.push({
          url: href.startsWith('http') ? href : `${baseUrl}${href}`,
          slug,
          title,
          publishedAt: new Date().toISOString(),
          isPaid: false,
        });
      }
    });
  }

  return posts;
}

export async function fetchPostContent(postUrl: string, publishedAt?: string): Promise<SubstackPost> {
  const response = await rateLimiter.fetch(postUrl, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch post: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Extract post metadata
  const title = $('h1.post-title').text().trim() ||
                $('meta[property="og:title"]').attr('content') ||
                'Untitled';

  const subtitle = $('.subtitle').text().trim() ||
                   $('meta[property="og:description"]').attr('content') || '';

  const author = $('meta[name="author"]').attr('content') ||
                 $('.author-name').text().trim() ||
                 'Unknown';

  // Extract date (prefer passed date from archive API)
  const dateStr = publishedAt ||
                  $('time').attr('datetime') ||
                  $('meta[property="article:published_time"]').attr('content') ||
                  new Date().toISOString();

  // Extract main content
  const contentElement = $('.body.markup, .post-content, article .available-content');
  const content = contentElement.html() || '';

  // Extract images
  const images: SubstackPost['images'] = [];
  contentElement.find('img').each((_, img) => {
    const src = $(img).attr('src');
    const alt = $(img).attr('alt') || '';

    if (src && !src.includes('substackcdn.com/image/fetch/w_')) {
      images.push({
        originalUrl: src,
        localPath: '', // Will be set during processing
        altText: alt,
      });
    }
  });

  // Check if post is paid/gated
  const isPaid = html.includes('paywall') ||
                 $('.paywall').length > 0 ||
                 $('.subscribe-widget').length > 0;

  const slug = postUrl.split('/p/')[1]?.split('?')[0] || generateSlug(title);

  return {
    slug,
    title,
    subtitle,
    author,
    publishedAt: dateStr,
    url: postUrl,
    content,
    images,
    isPaid,
  };
}

export async function fetchAllPosts(
  baseUrl: string,
  dateRange?: DateRange,
  onProgress?: (current: number, total: number, title: string) => void
): Promise<SubstackPost[]> {
  const postList = await fetchArchivePostList(baseUrl);

  // Filter posts by date range if specified
  const filteredPostList = postList.filter(post => {
    if (!dateRange?.startDate && !dateRange?.endDate) return true;

    const postDate = new Date(post.publishedAt);
    if (dateRange.startDate && postDate < new Date(dateRange.startDate)) return false;
    if (dateRange.endDate && postDate > new Date(dateRange.endDate + 'T23:59:59')) return false;
    return true;
  });

  const posts: SubstackPost[] = [];

  for (let i = 0; i < filteredPostList.length; i++) {
    const item = filteredPostList[i];

    if (onProgress) {
      onProgress(i + 1, filteredPostList.length, item.title);
    }

    try {
      const post = await fetchPostContent(item.url, item.publishedAt);
      posts.push(post);
    } catch (error) {
      console.error(`Failed to fetch post: ${item.title}`, error);
      // Continue with next post
    }
  }

  return posts;
}
