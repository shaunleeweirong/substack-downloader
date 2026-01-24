'use client';

import { useState, useEffect, useCallback } from 'react';

interface CookieInputProps {
  value: string;
  onChange: (cookie: string) => void;
  disabled?: boolean;
}

// Parse initial value to extract cookie values (handles both substack.sid and connect.sid)
function parseInitialValue(value: string): { sid: string; sidType: 'substack' | 'connect' | ''; lli: string } {
  let sid = '';
  let sidType: 'substack' | 'connect' | '' = '';
  let lli = '';
  if (value) {
    const parts = value.split(';').map(p => p.trim());
    for (const part of parts) {
      if (part.startsWith('substack.sid=')) {
        sid = part.replace('substack.sid=', '');
        sidType = 'substack';
      } else if (part.startsWith('connect.sid=')) {
        sid = part.replace('connect.sid=', '');
        sidType = 'connect';
      } else if (part.startsWith('substack.lli=')) {
        lli = part.replace('substack.lli=', '');
      }
    }
  }
  return { sid, sidType, lli };
}

// Parse URL hash for cookie data from extension
function parseHashParams(): { sid?: string; sidType?: 'substack' | 'connect'; lli?: string } | null {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash.slice(1); // Remove the #
  if (!hash) return null;

  try {
    const params = new URLSearchParams(hash);
    const sid = params.get('sid');
    const sidType = params.get('sidType') as 'substack' | 'connect' | null;
    const lli = params.get('lli');

    if (sid && sidType) {
      return { sid, sidType, lli: lli || undefined };
    }
  } catch {
    // Invalid hash format, ignore
  }
  return null;
}

// Get initial values from hash or prop
function getInitialState(value: string) {
  const hashData = parseHashParams();
  if (hashData && hashData.sid) {
    return {
      sid: hashData.sid,
      sidType: hashData.sidType || 'substack' as const,
      lli: hashData.lli || '',
      fromExtension: true,
      isExpanded: true
    };
  }
  const parsed = parseInitialValue(value);
  return {
    sid: parsed.sid,
    sidType: parsed.sidType || 'substack' as const,
    lli: parsed.lli,
    fromExtension: false,
    isExpanded: false
  };
}

export function CookieInput({ value, onChange, disabled }: CookieInputProps) {
  // Initialize all state from hash (if present) or value prop
  const initial = getInitialState(value);
  const [isExpanded, setIsExpanded] = useState(initial.isExpanded);
  const [fromExtension] = useState(initial.fromExtension);
  const [sidValue, setSidValue] = useState(initial.sid);
  const [sidType, setSidType] = useState<'substack' | 'connect'>(initial.sidType);
  const [lliValue, setLliValue] = useState(initial.lli);

  // Clear hash on mount if we loaded from extension (for security)
  useEffect(() => {
    if (initial.fromExtension && typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Combine values and notify parent
  const updateCombinedValue = useCallback(() => {
    const parts: string[] = [];
    if (sidValue.trim()) {
      const cookieName = sidType === 'connect' ? 'connect.sid' : 'substack.sid';
      parts.push(`${cookieName}=${sidValue.trim()}`);
    }
    if (lliValue.trim()) parts.push(`substack.lli=${lliValue.trim()}`);
    onChange(parts.join('; '));
  }, [sidValue, sidType, lliValue, onChange]);

  useEffect(() => {
    updateCombinedValue();
  }, [updateCombinedValue]);

  const inputClassName = "w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-zinc-100 disabled:cursor-not-allowed dark:bg-zinc-800 dark:border-zinc-600 dark:text-white dark:placeholder-zinc-500 font-mono";

  return (
    <div className="w-full max-w-xl">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={disabled}
        className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
      >
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span>Have a paid subscription? Access full content</span>
      </button>

      {isExpanded && (
        <div className="mt-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <div className="space-y-4">
            {/* Success message when loaded from extension */}
            {fromExtension && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-400">
                  Cookie loaded from extension! You can now download your paid content.
                </p>
              </div>
            )}

            {/* Instructions */}
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              <p className="font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                To download paid posts you subscribe to:
              </p>
              <ol className="list-decimal ml-4 space-y-1">
                <li>
                  Install the{' '}
                  <a
                    href="https://github.com/your-repo/substack-downloader/tree/main/extension#installation"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 underline"
                  >
                    Substack Cookie Extractor
                  </a>
                  {' '}Chrome extension
                </li>
                <li>Go to any Substack page while logged in</li>
                <li>Click the extension icon in your toolbar</li>
                <li>Click &quot;Open Downloader with Cookie&quot; or copy and paste below</li>
              </ol>
            </div>

            {/* Separate cookie input fields */}
            <div className="space-y-3">
              {/* Session ID - Required */}
              <div>
                <label
                  htmlFor="session-cookie"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Session Cookie <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setSidType('substack')}
                    disabled={disabled}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      sidType === 'substack'
                        ? 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700'
                        : 'bg-zinc-100 text-zinc-600 border-zinc-300 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-400 dark:border-zinc-600'
                    }`}
                  >
                    substack.sid
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidType('connect')}
                    disabled={disabled}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      sidType === 'connect'
                        ? 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700'
                        : 'bg-zinc-100 text-zinc-600 border-zinc-300 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-400 dark:border-zinc-600'
                    }`}
                  >
                    connect.sid
                  </button>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-500 mb-2">
                  {sidType === 'substack'
                    ? 'Use substack.sid for publications on *.substack.com'
                    : 'Use connect.sid for publications with custom domains (e.g., lennysnewsletter.com)'}
                </p>
                <input
                  id="session-cookie"
                  type="text"
                  value={sidValue}
                  onChange={(e) => setSidValue(e.target.value)}
                  placeholder="s%3A... or long alphanumeric string"
                  disabled={disabled}
                  className={inputClassName}
                />
              </div>

              {/* Logged-in indicator - Optional */}
              <div>
                <label
                  htmlFor="substack-lli"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  substack.lli
                  <span className="font-normal text-zinc-500 ml-1">(optional)</span>
                </label>
                <input
                  id="substack-lli"
                  type="text"
                  value={lliValue}
                  onChange={(e) => setLliValue(e.target.value)}
                  placeholder="Usually a number like 1704067200000"
                  disabled={disabled}
                  className={inputClassName}
                />
              </div>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              Your cookies are only used for this download and are never stored.
            </p>

            {/* Manual instructions fallback */}
            <details className="text-xs text-zinc-500 dark:text-zinc-500">
              <summary className="cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-400">
                Extension not working? Get cookies manually
              </summary>
              <div className="mt-2 p-2 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-400">
                <ol className="list-decimal ml-4 space-y-1">
                  <li>Open the Substack publication while logged in</li>
                  <li>Open Developer Tools (F12 or Cmd+Option+I)</li>
                  <li>Go to Application → Cookies</li>
                  <li>
                    For <strong>*.substack.com</strong> sites: find <code>substack.sid</code>
                  </li>
                  <li>
                    For <strong>custom domains</strong> (e.g., lennysnewsletter.com): find <code>connect.sid</code>
                  </li>
                  <li>Copy the cookie <strong>Value</strong> (not the name) and paste above</li>
                  <li>Select the correct cookie type button above</li>
                </ol>
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
