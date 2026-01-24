# Substack Cookie Extractor - Chrome Extension

A Chrome extension that extracts Substack authentication cookies for use with the [Substack Archive Downloader](https://substack-downloader.vercel.app).

## Why This Extension?

To download paid content from Substack publications you subscribe to, the downloader needs your authentication cookies. This extension makes extracting those cookies simple and secure:

- **One-click extraction** - No need to dig through DevTools
- **Auto-detects cookie type** - Works with both `*.substack.com` and custom domains
- **Secure** - Cookies stay local to your browser; never sent to any server

## Installation

### From Source (Developer Mode)

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `extension/` folder

### From Chrome Web Store

Coming soon!

## Usage

1. **Log in** to the Substack publication you're subscribed to
2. **Click the extension icon** in your Chrome toolbar
3. The extension will detect your authentication cookies
4. Either:
   - Click **"Open Downloader with Cookie"** to open the downloader with cookies pre-filled
   - Click **"Copy to Clipboard"** to manually paste into the downloader

## Supported Sites

- `*.substack.com` publications (uses `substack.sid` cookie)
- Custom domain publications like `lennysnewsletter.com` (uses `connect.sid` cookie)

## Privacy

- **No data collection** - The extension never sends your cookies anywhere
- **Local only** - Cookie extraction happens entirely in your browser
- **Open source** - Review the code yourself

## Troubleshooting

### "No Substack cookies found"

- Make sure you're logged into Substack
- Try visiting a publication page (not just the Substack homepage)
- Clear cookies and log in again

### Extension icon is grayed out

- The extension needs to be on a webpage to work
- Make sure you're not on a Chrome internal page (`chrome://...`)

### Cookies detected but download still fails

- Make sure you're using the correct cookie type:
  - `substack.sid` for `*.substack.com` sites
  - `connect.sid` for custom domains
- Some publications may have additional access restrictions

## Development

The extension is built with vanilla JavaScript and uses Chrome's Manifest V3.

### Files

- `manifest.json` - Extension configuration
- `popup.html` - Extension popup UI
- `popup.js` - Cookie extraction logic
- `icons/` - Extension icons

### Testing

1. Load the extension in developer mode
2. Visit a Substack publication while logged in
3. Click the extension icon
4. Verify cookies are detected

## License

MIT
