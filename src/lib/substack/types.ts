export interface SubstackPost {
  slug: string;
  title: string;
  subtitle?: string;
  author: string;
  publishedAt: string;
  url: string;
  content: string;
  images: PostImage[];
  isPaid: boolean;
}

export interface PostImage {
  originalUrl: string;
  localPath: string;
  altText: string;
  data?: Buffer;
}

export interface SubstackPublication {
  name: string;
  subdomain: string;
  description?: string;
  author?: string;
  url: string;
  hasPaidContent: boolean;
}

export interface ArchiveResponse {
  publication: SubstackPublication;
  posts: SubstackPost[];
  totalPosts: number;
  hasMore: boolean;
}

export interface DownloadProgress {
  currentPost: string;
  processedPosts: number;
  totalPosts: number;
  percentage: number;
  status: 'fetching' | 'processing' | 'downloading-images' | 'creating-zip' | 'complete' | 'error';
  error?: string;
  // SSE response fields
  zipData?: string; // Base64-encoded ZIP data (sent on complete)
  filename?: string;
  publicationName?: string;
  hasPaidContent?: boolean;
}

export interface ProcessedPost {
  filename: string;
  markdown: string;
  images: PostImage[];
  frontmatter: PostFrontmatter;
}

export interface PostFrontmatter {
  title: string;
  author: string;
  publication: string;
  date: string;
  url: string;
  subtitle?: string;
}
