import * as cheerio from 'cheerio';
import { SubstackPost, SubstackPublication } from './types';
import { RateLimiter } from '../utils/rate-limiter';
import { USER_AGENT } from '../constants';
import { generateSlug } from '../utils/slug';

const rateLimiter = new RateLimiter();

/**
 * Check if the cookie is for a custom domain (connect.sid) vs substack.com (substack.sid)
 */
function isCustomDomainCookie(cookie: string): boolean {
  return cookie.includes('connect.sid=');
}

/**
 * Build headers for Substack requests, optionally including auth cookie.
 * authCookie should be the full cookie string (e.g., "substack.sid=xxx; substack.lli=yyy")
 */
function buildHeaders(authCookie?: string, forApi = false, subdomain?: string): HeadersInit {
  const headers: HeadersInit = { 'User-Agent': USER_AGENT };

  // For API requests, explicitly request JSON (matches Python library behavior)
  if (forApi) {
    headers['Accept'] = 'application/json';
    headers['Content-Type'] = 'application/json';

    // Add browser-like headers that might be checked for authentication
    if (subdomain) {
      const origin = `https://${subdomain}.substack.com`;
      headers['Origin'] = origin;
      headers['Referer'] = `${origin}/`;
      // Sec-Fetch headers that browsers send
      headers['Sec-Fetch-Dest'] = 'empty';
      headers['Sec-Fetch-Mode'] = 'cors';
      headers['Sec-Fetch-Site'] = 'same-origin';
    }
  }

  if (authCookie) {
    // URL-decode the cookie value in case user copied encoded version from DevTools
    // e.g., "s%3Axxx" should be "s:xxx"
    let decodedCookie = authCookie;
    try {
      decodedCookie = decodeURIComponent(authCookie);
    } catch {
      // If decoding fails, use original value
    }
    headers['Cookie'] = decodedCookie;
  }
  return headers;
}

/**
 * Verify if the auth cookie is valid by comparing API responses with/without cookie.
 * If they're identical, the cookie isn't being recognized.
 * @param authCookie - The cookie string
 * @param baseUrl - The base URL to test against (custom domain or subdomain.substack.com)
 * @param subdomain - The subdomain (used for fallback if baseUrl verification fails)
 */
async function verifyAuthCookie(authCookie: string, baseUrl: string, subdomain: string): Promise<{ valid: boolean; message: string }> {
  try {
    // Determine the correct URL to verify against based on cookie type
    const testBaseUrl = isCustomDomainCookie(authCookie)
      ? baseUrl  // Custom domain cookie (connect.sid)
      : `https://${subdomain}.substack.com`;  // Substack cookie (substack.sid)

    const testUrl = `${testBaseUrl}/api/v1/archive?limit=1`;

    // Fetch WITH cookie
    const withCookie = await fetch(testUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
        'Cookie': authCookie,
      },
    });

    // Fetch WITHOUT cookie
    const withoutCookie = await fetch(testUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (!withCookie.ok || !withoutCookie.ok) {
      return { valid: false, message: 'Could not verify cookie' };
    }

    const dataWith = await withCookie.json();
    const dataWithout = await withoutCookie.json();

    // Compare responses - if identical, cookie isn't being recognized
    const responseWithStr = JSON.stringify(dataWith);
    const responseWithoutStr = JSON.stringify(dataWithout);

    if (responseWithStr === responseWithoutStr) {
      console.log('[Auth] Cookie not recognized - may be expired or invalid');
      return {
        valid: false,
        message: 'Cookie is not being recognized by Substack. Please get a fresh cookie from your browser while logged in.',
      };
    }

    console.log('[Auth] Cookie verified successfully');
    return { valid: true, message: 'Cookie appears valid' };
  } catch (error) {
    console.error('[Auth Verify] Error verifying cookie:', error);
    return { valid: false, message: 'Error verifying cookie' };
  }
}

/**
 * Extract images from HTML content
 */
function extractImagesFromHtml(html: string): SubstackPost['images'] {
  const $ = cheerio.load(html);
  const images: SubstackPost['images'] = [];

  $('img').each((_, img) => {
    const src = $(img).attr('src');
    const alt = $(img).attr('alt') || '';

    if (src && !src.includes('substackcdn.com/image/fetch/w_')) {
      images.push({
        originalUrl: src,
        localPath: '',
        altText: alt,
      });
    }
  });

  return images;
}

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
async function resolveBaseUrl(subdomain: string, authCookie?: string): Promise<string> {
  const initialUrl = `https://${subdomain}.substack.com`;

  try {
    // Follow redirects to get the final URL and page content
    const response = await fetch(initialUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: buildHeaders(authCookie),
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
            headers: buildHeaders(authCookie),
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
          headers: buildHeaders(authCookie),
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

export async function fetchPublicationInfo(subdomain: string, authCookie?: string): Promise<SubstackPublication> {
  // First, resolve the actual base URL (handles custom domains and redirects)
  const baseUrl = await resolveBaseUrl(subdomain, authCookie);
  const initialUrl = `https://${subdomain}.substack.com`;

  const response = await rateLimiter.fetch(baseUrl, {
    headers: buildHeaders(authCookie),
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

export async function fetchArchivePostList(baseUrl: string, authCookie?: string): Promise<PostListItem[]> {
  const posts: PostListItem[] = [];
  let offset = 0;
  const limit = 12;
  let hasMore = true;

  while (hasMore) {
    const archiveUrl = `${baseUrl}/api/v1/archive?sort=new&search=&offset=${offset}&limit=${limit}`;

    const response = await rateLimiter.fetch(archiveUrl, {
      headers: buildHeaders(authCookie, true), // forApi = true
    });

    if (!response.ok) {
      // Try fallback to HTML scraping if API fails
      if (offset === 0) {
        return await fetchArchiveFromHtml(baseUrl, authCookie);
      }
      break;
    }

    // Check if response is JSON (not a redirect HTML page)
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      if (offset === 0) {
        return await fetchArchiveFromHtml(baseUrl, authCookie);
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

async function fetchArchiveFromHtml(baseUrl: string, authCookie?: string): Promise<PostListItem[]> {
  const posts: PostListItem[] = [];
  const archiveUrl = `${baseUrl}/archive`;

  const response = await rateLimiter.fetch(archiveUrl, {
    headers: buildHeaders(authCookie),
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

/**
 * Fetch post content using the JSON API (preferred method for paid content)
 * @param subdomain - The original subdomain (used to construct substack.com URL for authenticated requests)
 */
export async function fetchPostContent(
  postUrl: string,
  publishedAt?: string,
  authCookie?: string,
  subdomain?: string
): Promise<SubstackPost> {
  // Extract base URL and slug from post URL
  const url = new URL(postUrl);
  const slug = url.pathname.split('/p/')[1]?.split('?')[0];

  if (!slug) {
    console.log(`[Fetch] No slug found in URL, falling back to HTML scraping`);
    return fetchPostContentFromHtml(postUrl, publishedAt, authCookie);
  }

  // Determine API base URL based on cookie type
  // - connect.sid = custom domain cookie, use the post's actual domain
  // - substack.sid = substack.com cookie, use subdomain.substack.com
  let apiBaseUrl = `${url.protocol}//${url.host}`;
  if (authCookie) {
    if (isCustomDomainCookie(authCookie)) {
      // Custom domain cookie (connect.sid) - use the post's domain
    } else if (subdomain) {
      // Substack cookie (substack.sid) - use subdomain.substack.com
      apiBaseUrl = `https://${subdomain}.substack.com`;
    }
  }

  // Use JSON API endpoint
  const apiUrl = `${apiBaseUrl}/api/v1/posts/${slug}`;

  try {
    const response = await rateLimiter.fetch(apiUrl, {
      headers: buildHeaders(authCookie, true, subdomain),
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('application/json')) {
      return fetchPostContentFromHtml(postUrl, publishedAt, authCookie);
    }

    const data = await response.json();

    // Extract content from JSON response
    const title = data.title || 'Untitled';
    const subtitle = data.subtitle || '';
    const author = data.publishedBylines?.[0]?.name || data.author?.name || 'Unknown';
    const dateStr = publishedAt || data.post_date || new Date().toISOString();
    const content = data.body_html || '';
    const isPaid = data.audience === 'only_paid';

    // Check if we got truncated content (API might still return preview for non-subscribers)
    if (isPaid && content.length < 1000 && authCookie) {
      // Try HTML fallback in case it has more content
      try {
        const htmlPost = await fetchPostContentFromHtml(postUrl, publishedAt, authCookie);
        if (htmlPost.content.length > content.length) {
          return htmlPost;
        }
      } catch {
        // HTML fallback failed, use API content
      }
    }

    // Extract images from the body_html
    const images = extractImagesFromHtml(content);

    return {
      slug: slug || generateSlug(title),
      title,
      subtitle,
      author,
      publishedAt: dateStr,
      url: data.canonical_url || postUrl,
      content,
      images,
      isPaid,
    };
  } catch {
    return fetchPostContentFromHtml(postUrl, publishedAt, authCookie);
  }
}

/**
 * Fallback: Fetch post content by scraping HTML page
 */
async function fetchPostContentFromHtml(postUrl: string, publishedAt?: string, authCookie?: string): Promise<SubstackPost> {
  const response = await rateLimiter.fetch(postUrl, {
    headers: buildHeaders(authCookie),
  });

  // Check for auth errors
  if (response.status === 401 || response.status === 403) {
    throw new Error('Authentication failed. Your cookie may be invalid or expired.');
  }

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

  // Extract main content - try multiple selectors and pick the one with most content
  // This handles both authenticated (full content) and unauthenticated (preview) cases
  const possibleSelectors = [
    '.body.markup',                        // Standard post body
    '.post-content',                       // Alternative container
    '.available-content',                  // Free/preview content
    '.post-content-final',                 // Sometimes used for full content
    '[data-component-name="PostBody"]',    // React component selector
  ];

  let content = '';
  let bestSelector = '';

  // Try selectors and pick the one with the most content
  for (const selector of possibleSelectors) {
    const el = $(selector);
    if (el.length > 0) {
      const elHtml = el.html() || '';
      if (elHtml.length > content.length) {
        content = elHtml;
        bestSelector = selector;
      }
    }
  }

  // Fallback to article body if nothing found
  if (!content) {
    const articleEl = $('article');
    content = articleEl.html() || '';
    bestSelector = 'article';
  }

  // Extract images from the best content element
  const images: SubstackPost['images'] = [];
  if (bestSelector) {
    $(bestSelector).find('img').each((_, img) => {
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
  }

  // Check if post is paid/gated
  const hasPaywall = html.includes('paywall') || $('.paywall').length > 0;
  const hasSubscribeWidget = $('.subscribe-widget').length > 0;
  const isPaid = hasPaywall || hasSubscribeWidget;

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
  subdomain: string,
  dateRange?: DateRange,
  authCookie?: string,
  onProgress?: (current: number, total: number, title: string) => void
): Promise<SubstackPost[]> {
  // Verify auth cookie if provided
  if (authCookie) {
    const decodedCookie = decodeURIComponent(authCookie);
    const authResult = await verifyAuthCookie(decodedCookie, baseUrl, subdomain);
    if (!authResult.valid) {
      console.warn('[Auth] ' + authResult.message);
    }
  }

  const postList = await fetchArchivePostList(baseUrl, authCookie);

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
      // Pass subdomain for authenticated API calls to substack.com
      const post = await fetchPostContent(item.url, item.publishedAt, authCookie, subdomain);
      posts.push(post);
    } catch (error) {
      console.error(`Failed to fetch post: ${item.title}`, error);
      // Continue with next post
    }
  }

  return posts;
}
