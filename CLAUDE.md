# Substack Archive Downloader - Claude Instructions

## Working Guidelines

1. **Think first, then act** - Read the codebase for relevant files before making changes.
2. **Check in before major changes** - Verify the plan with the user before implementing.
3. **Explain at a high level** - Give concise explanations of what changes were made.
4. **Keep it simple** - Every change should be as minimal as possible. Avoid complex or sweeping changes. Simplicity is the priority.
5. **Maintain documentation** - Keep this file and architecture docs up to date.
6. **Never speculate** - Always read files before answering questions about them. Give grounded, hallucination-free answers.

---

## Project Overview

A web application that downloads entire Substack publication archives as Markdown files for offline reading. Users paste a Substack URL, and the tool extracts all posts (text and images) into organized Markdown files packaged as a ZIP.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Key Libraries**:
  - `turndown` - HTML to Markdown
  - `jszip` - ZIP creation
  - `cheerio` - HTML parsing
  - `zod` - Validation

## Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run start    # Run production build
npm run lint     # Run ESLint
```

---

## Architecture

```
src/
├── app/
│   ├── page.tsx              # Main landing page (client component)
│   ├── layout.tsx            # Root layout with metadata
│   └── api/
│       ├── validate/         # URL validation endpoint
│       ├── fetch-posts/      # Fetch post list from archive
│       └── download/         # Full download + ZIP creation
│
├── components/
│   ├── url-input.tsx         # URL input with validation
│   ├── progress-bar.tsx      # Download progress indicator
│   ├── download-button.tsx   # Triggers file download
│   ├── error-message.tsx     # Error display
│   └── paid-content-notice.tsx
│
├── lib/
│   ├── substack/
│   │   ├── types.ts          # Core TypeScript interfaces
│   │   ├── scraper.ts        # Fetches posts from Substack
│   │   ├── parser.ts         # Converts HTML → Markdown
│   │   └── image-handler.ts  # Downloads images
│   │
│   ├── archive/
│   │   ├── zip-builder.ts    # Creates ZIP archive
│   │   ├── file-naming.ts    # Generates metadata.json
│   │   └── readme-generator.ts
│   │
│   ├── utils/
│   │   ├── url-validator.ts  # Substack URL validation
│   │   ├── rate-limiter.ts   # 1 req/sec rate limiting
│   │   └── slug.ts           # Filename generation
│   │
│   └── constants.ts          # App-wide constants
│
└── hooks/
    └── use-download.ts       # Client-side download state
```

## Data Flow

1. User enters Substack URL → `url-input.tsx`
2. Client calls `/api/download` → `download/route.ts`
3. Server fetches publication info → `scraper.ts`
4. Server fetches all posts → `scraper.ts`
5. Posts converted to Markdown → `parser.ts`
6. Images downloaded → `image-handler.ts`
7. ZIP created → `zip-builder.ts`
8. ZIP returned to client → downloaded via `download-button.tsx`

## Important Notes

- **Rate limiting**: 1 request/second to avoid Substack blocking
- **No credentials stored**: App never collects passwords
- **Images in memory**: Downloaded to buffer, not disk
- **Paid content**: Detected but requires user's browser session (not yet fully implemented)

## Output Format

Downloaded ZIP contains:
- `README.md` - Publication info + table of contents
- `metadata.json` - Structured publication data
- `images/` - All downloaded images
- `YYYY-MM-DD-post-slug.md` - Individual posts with YAML frontmatter
