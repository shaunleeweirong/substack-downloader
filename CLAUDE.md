# Substack Archive Downloader - Claude Instructions

## Core Workflow

1. **Think first, read second** - Think through the problem and read relevant files in the codebase before taking action.
2. **Check in before major changes** - Before making any significant changes, verify the plan with me first.
3. **High-level explanations** - At every step, provide a concise explanation of what changes were made.
4. **Simplicity first** - Make every task and code change as simple as possible. Avoid massive or complex changes. Every change should impact as little code as possible.
5. **Maintain documentation** - Keep this file and architecture docs up to date.
6. **No speculation** - Never speculate about code you haven't opened. If a specific file is referenced, you MUST read it before answering. Give grounded, hallucination-free answers.
7. **No AI attribution** - Never include Claude/AI co-author lines, attributions, or mentions in commit messages, code comments, or documentation.

## Error Handling

- Include error logging so there's clear feedback on where errors occur and what they're about.

## MCP Response Handling

**Rule:** Any MCP response over 50 lines must be saved to `.context/mcp/`

**Process:**
1. Save the **FULL response** to file:
```bash
echo '{full_response}' > .context/mcp/{server}/{tool}_$(date +%s).json
```
2. Report **only a summary** in chat, e.g.:
   > "Saved 200 lines to `.context/mcp/supabase/execute_sql_1704729600.json`. Found 12 tables."

This keeps conversations clean while preserving full data for reference.

## Testing Requirements

When shipping a new feature:
1. **Unit test** - Verify the new feature works in isolation
2. **Regression test** - Confirm existing features still work after the change
3. **Integration test** - Test that new + existing features work together

Before marking a feature complete:
- List which existing features could be affected
- Run/create tests covering those interactions
- Report test results, e.g.: "Feature B complete. Verified: Feature A still works, A+B integration passes."

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

---

## Development History

### January 2026 - Large File Download Fix

**Problem**: Large publications (500+ posts like Lenny's Newsletter) failed to download because:
1. ZIP files exceeded JavaScript's string length limit when base64 encoded as a single string
2. Client-side `.join('')` of chunks recreated the same huge string problem

**Solution implemented**:
- **Server** (`src/app/api/download/route.ts`): Splits ZIP buffer into ~384KB chunks before base64 encoding, sends each chunk via SSE with `zipChunk`, `chunkIndex`, `totalChunks` fields
- **Client** (`src/hooks/use-download.ts`): Added `chunksToBlob()` function that converts each base64 chunk to `Uint8Array` separately, then creates a Blob from the array of byte arrays - no string concatenation
- **Types** (`src/lib/substack/types.ts`): Added `zipChunk`, `chunkIndex`, `totalChunks` fields to `DownloadProgress` interface

**Status**: Tested and working with large publications.

### January 2026 - Chrome Extension for Cookie Extraction

**Problem**: The bookmarklet for extracting Substack cookies was unreliable due to browser security restrictions blocking `javascript:` URLs in modern browsers.

**Solution implemented**:
- **Chrome Extension** (`extension/`): Created a Manifest V3 Chrome extension that:
  - Reads `substack.sid` from `*.substack.com` domains
  - Reads `connect.sid` from custom domains (e.g., lennysnewsletter.com)
  - Provides one-click "Open Downloader with Cookie" button
  - Provides "Copy to Clipboard" as fallback
- **Web App Integration** (`src/components/cookie-input.tsx`):
  - Added `parseHashParams()` to read cookie data from URL hash (`#sid=...&sidType=...`)
  - Auto-expands cookie section and shows success message when loaded from extension
  - Clears hash after reading for security
  - Updated instructions to reference extension instead of bookmarklet

**Files created**:
- `extension/manifest.json` - MV3 extension config
- `extension/popup.html` - Simple popup UI
- `extension/popup.js` - Cookie extraction logic
- `extension/icons/` - 16px, 48px, 128px icons
- `extension/README.md` - Installation instructions

**Status**: Extension loads correctly in Chrome. Requires testing on actual Substack domains.
