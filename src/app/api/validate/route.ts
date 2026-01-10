import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isValidSubstackUrl, extractSubdomain } from '@/lib/utils/url-validator';
import { fetchPublicationInfo } from '@/lib/substack/scraper';

const requestSchema = z.object({
  url: z.string().url(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = requestSchema.parse(body);

    // Validate URL format
    if (!isValidSubstackUrl(url)) {
      return NextResponse.json(
        { error: 'Please enter a valid Substack URL (e.g., https://example.substack.com)' },
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

    // Fetch publication info to verify it exists
    const publication = await fetchPublicationInfo(subdomain);

    return NextResponse.json({
      valid: true,
      publication: {
        name: publication.name,
        subdomain: publication.subdomain,
        hasPaidContent: publication.hasPaidContent,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    console.error('Validation error:', error);
    return NextResponse.json(
      { error: 'Could not validate the Substack URL. Please check the URL and try again.' },
      { status: 500 }
    );
  }
}
