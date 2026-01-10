import { ProcessedPost, SubstackPublication } from '../substack/types';

export interface ArchiveMetadata {
  publication: {
    name: string;
    subdomain: string;
    url: string;
    description?: string;
    author?: string;
  };
  archive: {
    downloadDate: string;
    totalPosts: number;
    totalImages: number;
    posts: Array<{
      filename: string;
      title: string;
      date: string;
      url: string;
    }>;
  };
}

export function generateMetadata(
  publication: SubstackPublication,
  posts: ProcessedPost[]
): ArchiveMetadata {
  const totalImages = posts.reduce((sum, post) => sum + post.images.length, 0);

  return {
    publication: {
      name: publication.name,
      subdomain: publication.subdomain,
      url: publication.url,
      description: publication.description,
      author: publication.author,
    },
    archive: {
      downloadDate: new Date().toISOString(),
      totalPosts: posts.length,
      totalImages,
      posts: posts.map((post) => ({
        filename: post.filename,
        title: post.frontmatter.title,
        date: post.frontmatter.date,
        url: post.frontmatter.url,
      })),
    },
  };
}
