import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isValidSubstackUrl, extractSubdomain } from '@/lib/utils/url-validator';
import { fetchArchivePostList, fetchPublicationInfo } from '@/lib/substack/scraper';

const requestSchema = z.object({
  url: z.string().url(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = requestSchema.parse(body);

    if (!isValidSubstackUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid Substack URL' },
        { status: 400 }
      );
    }

    const subdomain = extractSubdomain(url);
    if (!subdomain) {
      return NextResponse.json(
        { error: 'Could not extract subdomain from URL' },
        { status: 400 }
      );
    }

    // Fetch publication info
    const publication = await fetchPublicationInfo(subdomain);

    // Fetch post list
    const posts = await fetchArchivePostList(subdomain);

    return NextResponse.json({
      publication: {
        name: publication.name,
        subdomain: publication.subdomain,
        url: publication.url,
        hasPaidContent: publication.hasPaidContent,
      },
      posts: posts.map((post) => ({
        slug: post.slug,
        title: post.title,
        url: post.url,
        publishedAt: post.publishedAt,
        isPaid: post.isPaid,
      })),
      totalPosts: posts.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    console.error('Fetch posts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts. Please try again.' },
      { status: 500 }
    );
  }
}
