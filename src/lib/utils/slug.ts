export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

export function generateFilename(date: string, slug: string): string {
  // Format: YYYY-MM-DD-slug.md
  const dateStr = date.substring(0, 10); // Extract YYYY-MM-DD
  return `${dateStr}-${slug}.md`;
}

export function generateImageFilename(
  postDate: string,
  postSlug: string,
  imageIndex: number,
  extension: string
): string {
  const dateStr = postDate.substring(0, 10);
  return `${dateStr}-${postSlug}-image-${imageIndex + 1}.${extension}`;
}

export function getExtensionFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
    if (match) {
      const ext = match[1].toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        return ext;
      }
    }
  } catch {
    // Invalid URL
  }
  return 'jpg'; // Default extension
}
