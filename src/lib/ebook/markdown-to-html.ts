import { marked } from 'marked';

/**
 * Strip YAML frontmatter from markdown content
 */
export function stripFrontmatter(markdown: string): string {
  const frontmatterRegex = /^---\n[\s\S]*?\n---\n/;
  return markdown.replace(frontmatterRegex, '').trim();
}

/**
 * Convert local image paths to base64 data URIs
 */
export function embedImages(
  html: string,
  images: Map<string, Buffer>
): string {
  // Replace image src attributes that reference local paths
  // Markdown uses ./images/filename.png, and image map stores just filename
  return html.replace(
    /<img([^>]*?)src="\.?\/?\/?images\/([^"]+)"([^>]*?)>/gi,
    (match, before, imagePath, after) => {
      // Image map stores just the filename (no path prefix)
      const imageBuffer = images.get(imagePath);

      if (imageBuffer) {
        // Determine MIME type from extension
        const ext = imagePath.split('.').pop()?.toLowerCase() || 'png';
        const mimeType = getMimeType(ext);
        const base64 = imageBuffer.toString('base64');
        return `<img${before}src="data:${mimeType};base64,${base64}"${after}>`;
      }

      // If image not found, remove the img tag to avoid epub-gen trying to fetch it
      console.warn(`[EPUB] Image not found in map: ${imagePath}`);
      return '';
    }
  );
}

/**
 * Get MIME type from file extension
 */
function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
  };
  return mimeTypes[ext] || 'image/png';
}

/**
 * Remove any img tags that aren't base64 data URIs
 * This prevents epub-gen from trying to fetch external URLs
 */
export function removeNonDataImages(html: string): string {
  // Keep only img tags with data: URIs, remove all others
  return html.replace(
    /<img[^>]*src="(?!data:)[^"]*"[^>]*>/gi,
    ''
  );
}

/**
 * Convert markdown to HTML with embedded images
 */
export async function markdownToHtml(
  markdown: string,
  images: Map<string, Buffer>
): Promise<string> {
  // Strip frontmatter
  const content = stripFrontmatter(markdown);

  // Convert markdown to HTML
  const html = await marked.parse(content);

  // Embed images as base64
  const htmlWithImages = embedImages(html, images);

  // Remove any remaining non-data-URI images to prevent fetch errors
  const cleanedHtml = removeNonDataImages(htmlWithImages);

  return cleanedHtml;
}
