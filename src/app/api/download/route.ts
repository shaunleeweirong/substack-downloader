import { NextRequest } from 'next/server';
import { z } from 'zod';
import { isValidSubstackUrl, extractSubdomain } from '@/lib/utils/url-validator';
import { fetchPublicationInfo, fetchAllPosts } from '@/lib/substack/scraper';
import { processAllPosts } from '@/lib/substack/parser';
import { downloadAllPostImages } from '@/lib/substack/image-handler';
import { buildArchiveZip, generateZipFilename } from '@/lib/archive/zip-builder';
import { DownloadProgress } from '@/lib/substack/types';

const requestSchema = z.object({
  url: z.string().url(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  // Helper to send SSE event
  const createProgressEvent = (progress: DownloadProgress): Uint8Array => {
    return encoder.encode(`data: ${JSON.stringify(progress)}\n\n`);
  };

  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (progress: DownloadProgress) => {
        controller.enqueue(createProgressEvent(progress));
      };

      const sendError = (message: string) => {
        sendProgress({
          currentPost: '',
          processedPosts: 0,
          totalPosts: 0,
          percentage: 0,
          status: 'error',
          error: message,
        });
        controller.close();
      };

      try {
        // Parse and validate request
        const body = await request.json();
        const { url, startDate, endDate } = requestSchema.parse(body);

        if (!isValidSubstackUrl(url)) {
          sendError('Invalid Substack URL');
          return;
        }

        const subdomain = extractSubdomain(url);
        if (!subdomain) {
          sendError('Could not extract subdomain from URL');
          return;
        }

        // Phase 1: Fetch publication info
        sendProgress({
          currentPost: '',
          processedPosts: 0,
          totalPosts: 0,
          percentage: 5,
          status: 'fetching',
        });

        const publication = await fetchPublicationInfo(subdomain);

        // Phase 2: Fetch all posts with progress updates
        sendProgress({
          currentPost: 'Discovering posts...',
          processedPosts: 0,
          totalPosts: 0,
          percentage: 10,
          status: 'fetching',
        });

        const posts = await fetchAllPosts(
          publication.baseUrl,
          { startDate: startDate || null, endDate: endDate || null },
          (current, total, title) => {
            const fetchProgress = 10 + (current / total) * 30; // 10-40%
            sendProgress({
              currentPost: title,
              processedPosts: current,
              totalPosts: total,
              percentage: Math.round(fetchProgress),
              status: 'fetching',
            });
          }
        );

        if (posts.length === 0) {
          sendError('No posts found in this publication');
          return;
        }

        // Phase 3: Process posts to markdown
        sendProgress({
          currentPost: 'Converting to Markdown...',
          processedPosts: posts.length,
          totalPosts: posts.length,
          percentage: 45,
          status: 'processing',
        });

        const processedPosts = processAllPosts(posts, publication.name);

        // Phase 4: Download all images
        sendProgress({
          currentPost: 'Downloading images...',
          processedPosts: posts.length,
          totalPosts: posts.length,
          percentage: 50,
          status: 'downloading-images',
        });

        const images = await downloadAllPostImages(processedPosts);

        // Phase 5: Build ZIP archive
        sendProgress({
          currentPost: 'Creating archive...',
          processedPosts: posts.length,
          totalPosts: posts.length,
          percentage: 85,
          status: 'creating-zip',
        });

        const zipBuffer = await buildArchiveZip({
          publication,
          posts: processedPosts,
          images,
        });

        // Generate filename
        const filename = generateZipFilename(subdomain);

        // Chunk the buffer BEFORE converting to base64 (avoids string length limit)
        const BUFFER_CHUNK_SIZE = 384 * 1024; // ~512KB after base64 encoding
        const totalChunks = Math.ceil(zipBuffer.length / BUFFER_CHUNK_SIZE);

        // Phase 6: Send ZIP data in chunks
        for (let i = 0; i < totalChunks; i++) {
          const start = i * BUFFER_CHUNK_SIZE;
          const end = Math.min(start + BUFFER_CHUNK_SIZE, zipBuffer.length);
          const bufferChunk = zipBuffer.slice(start, end);
          const chunkBase64 = bufferChunk.toString('base64');

          sendProgress({
            currentPost: `Sending data... (${i + 1}/${totalChunks})`,
            processedPosts: posts.length,
            totalPosts: posts.length,
            percentage: 85 + Math.round((i / totalChunks) * 14), // 85-99%
            status: 'creating-zip',
            zipChunk: chunkBase64,
            chunkIndex: i,
            totalChunks,
          });
        }

        // Phase 7: Complete
        sendProgress({
          currentPost: '',
          processedPosts: posts.length,
          totalPosts: posts.length,
          percentage: 100,
          status: 'complete',
          filename,
          publicationName: publication.name,
          hasPaidContent: publication.hasPaidContent,
        });

        controller.close();
      } catch (error) {
        console.error('Download error:', error);

        if (error instanceof z.ZodError) {
          sendError('Invalid request format');
        } else {
          sendError('Failed to create archive. Please try again.');
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
