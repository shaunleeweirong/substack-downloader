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

export async function fetchPublicationInfo(subdomain: string): Promise<SubstackPublication> {
  const url = `https://${subdomain}.substack.com`;

  const response = await rateLimiter.fetch(url, {
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
    url,
    hasPaidContent,
  };
}

export async function fetchArchivePostList(subdomain: string): Promise<PostListItem[]> {
  const posts: PostListItem[] = [];
  let offset = 0;
  const limit = 12;
  let hasMore = true;

  while (hasMore) {
    const archiveUrl = `https://${subdomain}.substack.com/api/v1/archive?sort=new&search=&offset=${offset}&limit=${limit}`;

    const response = await rateLimiter.fetch(archiveUrl, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!response.ok) {
      // Try fallback to HTML scraping if API fails
      if (offset === 0) {
        return await fetchArchiveFromHtml(subdomain);
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
        url: post.canonical_url || `https://${subdomain}.substack.com/p/${post.slug}`,
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

async function fetchArchiveFromHtml(subdomain: string): Promise<PostListItem[]> {
  const posts: PostListItem[] = [];
  const archiveUrl = `https://${subdomain}.substack.com/archive`;

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
        url: href.startsWith('http') ? href : `https://${subdomain}.substack.com${href}`,
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
          url: href.startsWith('http') ? href : `https://${subdomain}.substack.com${href}`,
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

export async function fetchPostContent(postUrl: string, subdomain: string): Promise<SubstackPost> {
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

  // Extract date
  const dateStr = $('time').attr('datetime') ||
                  $('meta[property="article:published_time"]').attr('content') ||
                  new Date().toISOString();

  // Extract main content
  const contentElement = $('.body.markup, .post-content, article .available-content');
  const content = contentElement.html() || '';

  // Extract images
  const images: SubstackPost['images'] = [];
  contentElement.find('img').each((index, img) => {
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
  subdomain: string,
  onProgress?: (current: number, total: number, title: string) => void
): Promise<SubstackPost[]> {
  const postList = await fetchArchivePostList(subdomain);
  const posts: SubstackPost[] = [];

  for (let i = 0; i < postList.length; i++) {
    const item = postList[i];

    if (onProgress) {
      onProgress(i + 1, postList.length, item.title);
    }

    try {
      const post = await fetchPostContent(item.url, subdomain);
      posts.push(post);
    } catch (error) {
      console.error(`Failed to fetch post: ${item.title}`, error);
      // Continue with next post
    }
  }

  return posts;
}
