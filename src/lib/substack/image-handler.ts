import { PostImage } from './types';
import { USER_AGENT, MAX_CONCURRENT_IMAGE_DOWNLOADS } from '../constants';

export async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function downloadImagesWithConcurrency(
  images: PostImage[],
  onProgress?: (downloaded: number, total: number) => void
): Promise<PostImage[]> {
  const results: PostImage[] = [];
  const queue = [...images];
  let completed = 0;

  async function processNext(): Promise<void> {
    while (queue.length > 0) {
      const image = queue.shift();
      if (!image) break;

      try {
        const data = await downloadImage(image.originalUrl);
        results.push({ ...image, data });
      } catch (error) {
        console.error(`Failed to download image: ${image.originalUrl}`, error);
        // Still add the image but without data
        results.push(image);
      }

      completed++;
      if (onProgress) {
        onProgress(completed, images.length);
      }
    }
  }

  // Create concurrent workers
  const workers = Array(Math.min(MAX_CONCURRENT_IMAGE_DOWNLOADS, images.length))
    .fill(null)
    .map(() => processNext());

  await Promise.all(workers);

  return results;
}

export async function downloadAllPostImages(
  posts: Array<{ images: PostImage[] }>,
  onProgress?: (postIndex: number, totalPosts: number, imageProgress: string) => void
): Promise<Map<string, Buffer>> {
  const imageMap = new Map<string, Buffer>();

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];

    if (post.images.length === 0) continue;

    const downloadedImages = await downloadImagesWithConcurrency(
      post.images,
      (downloaded, total) => {
        if (onProgress) {
          onProgress(i, posts.length, `${downloaded}/${total}`);
        }
      }
    );

    for (const image of downloadedImages) {
      if (image.data && image.localPath) {
        imageMap.set(image.localPath, image.data);
      }
    }
  }

  return imageMap;
}
