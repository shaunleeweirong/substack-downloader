import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isValidSubstackUrl, extractSubdomain } from '@/lib/utils/url-validator';
import { fetchPublicationInfo, fetchAllPosts } from '@/lib/substack/scraper';
import { processAllPosts } from '@/lib/substack/parser';
import { downloadAllPostImages } from '@/lib/substack/image-handler';
import { buildArchiveZip, generateZipFilename } from '@/lib/archive/zip-builder';

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

    // Fetch all posts
    const posts = await fetchAllPosts(subdomain);

    if (posts.length === 0) {
      return NextResponse.json(
        { error: 'No posts found in this publication' },
        { status: 404 }
      );
    }

    // Process posts to markdown
    const processedPosts = processAllPosts(posts, publication.name);

    // Download all images
    const images = await downloadAllPostImages(processedPosts);

    // Build ZIP archive
    const zipBuffer = await buildArchiveZip({
      publication,
      posts: processedPosts,
      images,
    });

    // Generate filename
    const filename = generateZipFilename(subdomain);

    // Return ZIP file
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Has-Paid-Content': publication.hasPaidContent ? 'true' : 'false',
        'X-Publication-Name': publication.name,
        'X-Filename': filename,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to create archive. Please try again.' },
      { status: 500 }
    );
  }
}
