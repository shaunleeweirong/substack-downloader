import TurndownService from 'turndown';
import { SubstackPost, ProcessedPost, PostFrontmatter } from './types';
import { generateFilename, generateImageFilename, getExtensionFromUrl } from '../utils/slug';

// Configure Turndown for optimal Substack content conversion
function createTurndownService(): TurndownService {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
    linkStyle: 'inlined',
  });

  // Custom rule for figures with captions
  turndown.addRule('figure', {
    filter: 'figure',
    replacement: function (content, node) {
      const figure = node as Element;
      const img = figure.querySelector('img');
      const figcaption = figure.querySelector('figcaption');

      if (img) {
        const src = img.getAttribute('src') || '';
        const alt = img.getAttribute('alt') || figcaption?.textContent || '';
        return `\n\n![${alt}](${src})\n\n`;
      }
      return content;
    },
  });

  // Handle Substack embeds (tweets, videos, etc.)
  turndown.addRule('substackEmbed', {
    filter: function (node) {
      return (
        node.nodeName === 'DIV' &&
        (node.classList.contains('tweet') ||
         node.classList.contains('youtube') ||
         node.classList.contains('embedded'))
      );
    },
    replacement: function (content, node) {
      const element = node as Element;
      const link = element.querySelector('a');
      if (link) {
        const href = link.getAttribute('href');
        const text = link.textContent || 'Embedded content';
        return `\n\n[${text}](${href})\n\n`;
      }
      return '\n\n[Embedded content]\n\n';
    },
  });

  // Handle blockquotes better
  turndown.addRule('blockquote', {
    filter: 'blockquote',
    replacement: function (content) {
      const lines = content.trim().split('\n');
      return '\n\n' + lines.map((line: string) => `> ${line}`).join('\n') + '\n\n';
    },
  });

  // Handle code blocks
  turndown.addRule('codeBlock', {
    filter: function (node) {
      return (
        node.nodeName === 'PRE' &&
        node.firstChild !== null &&
        node.firstChild.nodeName === 'CODE'
      );
    },
    replacement: function (content, node) {
      const code = (node as Element).querySelector('code');
      const className = code?.className || '';
      const language = className.match(/language-(\w+)/)?.[1] || '';
      return `\n\n\`\`\`${language}\n${code?.textContent || content}\n\`\`\`\n\n`;
    },
  });

  return turndown;
}

export function htmlToMarkdown(html: string): string {
  const turndown = createTurndownService();
  return turndown.turndown(html);
}

export function generateFrontmatter(frontmatter: PostFrontmatter): string {
  const lines = [
    '---',
    `title: "${escapeYaml(frontmatter.title)}"`,
    `author: "${escapeYaml(frontmatter.author)}"`,
    `publication: "${escapeYaml(frontmatter.publication)}"`,
    `date: ${frontmatter.date.substring(0, 10)}`,
    `url: ${frontmatter.url}`,
  ];

  if (frontmatter.subtitle) {
    lines.push(`subtitle: "${escapeYaml(frontmatter.subtitle)}"`);
  }

  lines.push('---');
  return lines.join('\n');
}

function escapeYaml(str: string): string {
  return str.replace(/"/g, '\\"').replace(/\n/g, ' ');
}

export function processPost(
  post: SubstackPost,
  publicationName: string
): ProcessedPost {
  // Generate frontmatter
  const frontmatter: PostFrontmatter = {
    title: post.title,
    author: post.author,
    publication: publicationName,
    date: post.publishedAt,
    url: post.url,
    subtitle: post.subtitle,
  };

  // Convert HTML to Markdown
  let markdown = htmlToMarkdown(post.content);

  // Process images and update paths
  const processedImages = post.images.map((img, index) => {
    const extension = getExtensionFromUrl(img.originalUrl);
    const localFilename = generateImageFilename(
      post.publishedAt,
      post.slug,
      index,
      extension
    );
    const localPath = `./images/${localFilename}`;

    // Replace original URL with local path in markdown
    markdown = markdown.replace(
      new RegExp(escapeRegExp(img.originalUrl), 'g'),
      localPath
    );

    return {
      ...img,
      localPath: localFilename,
    };
  });

  // Generate filename
  const filename = generateFilename(post.publishedAt, post.slug);

  // Combine frontmatter and content
  const fullMarkdown = `${generateFrontmatter(frontmatter)}\n\n# ${post.title}\n\n${markdown}`;

  return {
    filename,
    markdown: fullMarkdown,
    images: processedImages,
    frontmatter,
  };
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function processAllPosts(
  posts: SubstackPost[],
  publicationName: string
): ProcessedPost[] {
  return posts.map((post) => processPost(post, publicationName));
}
