import { ProcessedPost, SubstackPublication } from '../substack/types';

export function generateReadme(
  publication: SubstackPublication,
  posts: ProcessedPost[]
): string {
  const downloadDate = new Date().toISOString().substring(0, 10);
  const totalImages = posts.reduce((sum, post) => sum + post.images.length, 0);

  // Sort posts by date (newest first)
  const sortedPosts = [...posts].sort((a, b) => {
    return new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime();
  });

  let readme = `# ${publication.name} Archive

> Downloaded on ${downloadDate}

`;

  if (publication.description) {
    readme += `${publication.description}\n\n`;
  }

  readme += `## Archive Information

- **Publication URL:** ${publication.url}
`;

  if (publication.author) {
    readme += `- **Author:** ${publication.author}\n`;
  }

  readme += `- **Total Posts:** ${posts.length}
- **Total Images:** ${totalImages}

## Table of Contents

| Date | Title |
|------|-------|
`;

  for (const post of sortedPosts) {
    const date = post.frontmatter.date.substring(0, 10);
    const title = post.frontmatter.title.replace(/\|/g, '\\|');
    readme += `| ${date} | [${title}](./${post.filename}) |\n`;
  }

  readme += `
---

*This archive was created using [Substack Archive Downloader](https://github.com/your-repo).*
`;

  return readme;
}
