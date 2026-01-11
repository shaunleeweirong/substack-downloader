'use client';

import { useState, useEffect, useCallback } from 'react';

interface CookieInputProps {
  value: string;
  onChange: (cookie: string) => void;
  disabled?: boolean;
}

// Bookmarklet that extracts BOTH substack.sid and connect.sid cookies
// Works on both substack.com hosted publications and custom domains
const BOOKMARKLET_CODE = `javascript:(function(){var cookies={};document.cookie.split(';').forEach(function(c){var parts=c.trim().split('=');var name=parts[0];if(name==='substack.sid'||name==='connect.sid'||name==='substack.lli'){cookies[name]=parts.slice(1).join('=')}});if(Object.keys(cookies).length>0){var sid=cookies['substack.sid']||cookies['connect.sid'];var sidName=cookies['substack.sid']?'substack.sid':'connect.sid';var msg='Found cookies:\\n\\n'+sidName+' (Session ID):\\n'+sid+'\\n\\n';if(cookies['substack.lli']){msg+='substack.lli (optional):\\n'+cookies['substack.lli']+'\\n\\n'}alert(msg)}else{alert('No Substack cookies found. Make sure you are logged in.')}})()`;

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

export function CookieInput({ value, onChange, disabled }: CookieInputProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Initialize state from value prop
  const initialParsed = parseInitialValue(value);
  const [sidValue, setSidValue] = useState(initialParsed.sid);
  const [sidType, setSidType] = useState<'substack' | 'connect'>(initialParsed.sidType || 'substack');
  const [lliValue, setLliValue] = useState(initialParsed.lli);

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
            {/* Instructions */}
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              <p className="font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                To download paid posts you subscribe to:
              </p>
              <ol className="list-decimal ml-4 space-y-1">
                <li>
                  Drag this button to your bookmarks bar:{' '}
                  <a
                    href={BOOKMARKLET_CODE}
                    onClick={(e) => e.preventDefault()}
                    draggable="true"
                    className="inline-block px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded border border-orange-300 dark:border-orange-700 cursor-move hover:bg-orange-200 dark:hover:bg-orange-900/50"
                  >
                    Get Substack Cookies
                  </a>
                </li>
                <li>Go to any Substack page while logged in</li>
                <li>Click the bookmarklet - it will show your session cookie</li>
                <li>Copy the value into the field below</li>
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
                Bookmarklet not working? Get cookies manually
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
