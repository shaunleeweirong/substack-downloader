import epub, { Options, Chapter } from '@epubkit/epub-gen-memory';
import { ProcessedPost, SubstackPublication } from '@/lib/substack/types';
import { markdownToHtml } from './markdown-to-html';

/**
 * Build an EPUB file from processed posts
 */
export async function buildEPUB(
  publication: SubstackPublication,
  posts: ProcessedPost[],
  images: Map<string, Buffer>
): Promise<Buffer> {
  console.log(`[EPUB] Building EPUB for ${publication.name} with ${posts.length} posts`);

  // Sort posts oldest to newest (chronological order for reading)
  const sortedPosts = [...posts].sort((a, b) => {
    const dateA = new Date(a.frontmatter.date).getTime();
    const dateB = new Date(b.frontmatter.date).getTime();
    return dateA - dateB;
  });

  // Convert each post to an EPUB chapter
  const chapters: Chapter[] = [];

  for (const post of sortedPosts) {
    try {
      const html = await markdownToHtml(post.markdown, images);

      // Format chapter title with date
      const date = new Date(post.frontmatter.date);
      const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      chapters.push({
        title: `${post.frontmatter.title} (${formattedDate})`,
        content: html,
        author: post.frontmatter.author,
      });
    } catch (error) {
      console.error(`[EPUB] Error converting post "${post.frontmatter.title}":`, error);
      // Skip posts that fail to convert
    }
  }

  if (chapters.length === 0) {
    throw new Error('No posts could be converted to EPUB format');
  }

  // Build EPUB options
  const options: Options = {
    title: publication.name,
    author: publication.author || 'Unknown Author',
    publisher: 'Substack',
    description: publication.description || `Archive of ${publication.name}`,
  };

  console.log(`[EPUB] Generating EPUB with ${chapters.length} chapters`);

  // Generate EPUB (options, content, version)
  const epubBuffer = await epub(options, chapters, 3);

  console.log(`[EPUB] EPUB generated: ${epubBuffer.length} bytes`);

  return epubBuffer;
}

/**
 * Generate EPUB filename from publication identifier
 */
export function generateEpubFilename(identifier: string): string {
  const sanitized = identifier
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const date = new Date().toISOString().split('T')[0];
  return `${sanitized}-${date}.epub`;
}
