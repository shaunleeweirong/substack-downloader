// Substack Cookie Extractor - Chrome Extension
// Extracts authentication cookies for use with Substack Archive Downloader

const DOWNLOADER_URL = 'http://localhost:3000';

// Cookie names we're looking for
const COOKIE_NAMES = {
  SUBSTACK_SID: 'substack.sid',
  CONNECT_SID: 'connect.sid',
  SUBSTACK_LLI: 'substack.lli'
};

// State
let extractedCookies = {
  sid: null,
  sidType: null, // 'substack' or 'connect'
  sidDomain: null,
  lli: null
};
let currentTabUrl = null;

// DOM elements
const statusEl = document.getElementById('status');
const copyBtn = document.getElementById('copyBtn');
const openBtn = document.getElementById('openBtn');
const successMessage = document.getElementById('successMessage');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await detectCookies();
  setupEventListeners();
});

async function detectCookies() {
  try {
    // Get the current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) {
      showStatus('not-found', 'Could not access current tab.');
      return;
    }

    const url = new URL(tab.url);
    const currentDomain = url.hostname;

    // Store the current tab URL for use in handleOpenDownloader
    currentTabUrl = tab.url;

    // Check if we're on a Substack domain or potential custom domain
    const isSubstackDomain = currentDomain.endsWith('.substack.com') || currentDomain === 'substack.com';

    // Get cookies from the current domain
    const cookies = await chrome.cookies.getAll({ domain: currentDomain });

    // Also check substack.com if we're on a substack subdomain
    let substackCookies = [];
    if (isSubstackDomain) {
      substackCookies = await chrome.cookies.getAll({ domain: '.substack.com' });
    }

    // Combine and dedupe cookies
    const allCookies = [...cookies, ...substackCookies];

    // Look for session cookies
    let foundSid = null;
    let foundSidType = null;
    let foundSidDomain = null;
    let foundLli = null;

    for (const cookie of allCookies) {
      if (cookie.name === COOKIE_NAMES.CONNECT_SID && cookie.value) {
        // Always prefer connect.sid when present (custom domains)
        foundSid = cookie.value;
        foundSidType = 'connect';
        foundSidDomain = cookie.domain;
      } else if (cookie.name === COOKIE_NAMES.SUBSTACK_SID && cookie.value) {
        // Fall back to substack.sid if connect.sid not found
        if (!foundSid) {
          foundSid = cookie.value;
          foundSidType = 'substack';
          foundSidDomain = cookie.domain;
        }
      } else if (cookie.name === COOKIE_NAMES.SUBSTACK_LLI && cookie.value) {
        foundLli = cookie.value;
      }
    }

    // Update state
    extractedCookies = {
      sid: foundSid,
      sidType: foundSidType,
      sidDomain: foundSidDomain,
      lli: foundLli
    };

    // Update UI
    if (foundSid) {
      const cookieTypeName = foundSidType === 'substack' ? 'substack.sid' : 'connect.sid';
      let statusHtml = `<strong>Found authentication cookie!</strong>`;
      statusHtml += `<div class="cookie-info">`;
      statusHtml += `<span class="cookie-label">${cookieTypeName} (from ${foundSidDomain})</span>`;
      statusHtml += `<div class="cookie-value">${truncateValue(foundSid)}</div>`;
      statusHtml += `</div>`;

      if (foundLli) {
        statusHtml += `<div class="cookie-info">`;
        statusHtml += `<span class="cookie-label">substack.lli (optional)</span>`;
        statusHtml += `<div class="cookie-value">${foundLli}</div>`;
        statusHtml += `</div>`;
      }

      showStatus('found', statusHtml);
      copyBtn.disabled = false;
      openBtn.disabled = false;
    } else {
      let message = `<strong>No Substack cookies found</strong><br>`;
      message += `<span class="domain">Current domain: ${currentDomain}</span><br><br>`;
      message += `Make sure you are logged into Substack and visit a publication page.`;
      showStatus('not-found', message);
    }
  } catch (error) {
    console.error('Error detecting cookies:', error);
    showStatus('not-found', `Error: ${error.message}`);
  }
}

function setupEventListeners() {
  copyBtn.addEventListener('click', handleCopy);
  openBtn.addEventListener('click', handleOpenDownloader);
}

async function handleCopy() {
  if (!extractedCookies.sid) return;

  const cookieString = buildCookieString();

  try {
    await navigator.clipboard.writeText(cookieString);
    showSuccess();
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = cookieString;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showSuccess();
  }
}

function handleOpenDownloader() {
  if (!extractedCookies.sid) return;

  // Encode cookie data for URL hash
  const params = new URLSearchParams();
  params.set('sid', extractedCookies.sid);
  params.set('sidType', extractedCookies.sidType);
  if (extractedCookies.lli) {
    params.set('lli', extractedCookies.lli);
  }
  if (currentTabUrl) {
    params.set('url', currentTabUrl);
  }

  // Open downloader with cookie data in hash
  const url = `${DOWNLOADER_URL}#${params.toString()}`;
  chrome.tabs.create({ url });
}

function buildCookieString() {
  const parts = [];

  if (extractedCookies.sid) {
    const cookieName = extractedCookies.sidType === 'substack'
      ? COOKIE_NAMES.SUBSTACK_SID
      : COOKIE_NAMES.CONNECT_SID;
    parts.push(`${cookieName}=${extractedCookies.sid}`);
  }

  if (extractedCookies.lli) {
    parts.push(`${COOKIE_NAMES.SUBSTACK_LLI}=${extractedCookies.lli}`);
  }

  return parts.join('; ');
}

function showStatus(type, html) {
  statusEl.className = `status ${type}`;
  statusEl.innerHTML = html;
}

function showSuccess() {
  successMessage.style.display = 'block';
  setTimeout(() => {
    successMessage.style.display = 'none';
  }, 2000);
}

function truncateValue(value) {
  if (value.length > 50) {
    return value.substring(0, 25) + '...' + value.substring(value.length - 20);
  }
  return value;
}
