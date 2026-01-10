import JSZip from 'jszip';
import { ProcessedPost, SubstackPublication } from '../substack/types';
import { generateReadme } from './readme-generator';
import { generateMetadata } from './file-naming';

export interface ZipBuildOptions {
  publication: SubstackPublication;
  posts: ProcessedPost[];
  images: Map<string, Buffer>;
}

export async function buildArchiveZip(options: ZipBuildOptions): Promise<Buffer> {
  const { publication, posts, images } = options;
  const zip = new JSZip();

  // Add README.md
  const readme = generateReadme(publication, posts);
  zip.file('README.md', readme);

  // Add metadata.json
  const metadata = generateMetadata(publication, posts);
  zip.file('metadata.json', JSON.stringify(metadata, null, 2));

  // Create images folder
  const imagesFolder = zip.folder('images');

  // Add images
  for (const [filename, data] of images) {
    imagesFolder?.file(filename, data);
  }

  // Add markdown posts
  for (const post of posts) {
    zip.file(post.filename, post.markdown);
  }

  // Generate ZIP buffer
  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return zipBuffer;
}

export function generateZipFilename(subdomain: string): string {
  const date = new Date().toISOString().substring(0, 10);
  return `${subdomain}-archive-${date}.zip`;
}
