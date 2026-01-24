'use client';

import { useState } from 'react';
import { isValidUrl } from '@/lib/utils/url-validator';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

// Parse URL hash for URL param from extension
// Called during initialization to get URL before hash is cleared
function getInitialUrl(): string {
  if (typeof window === 'undefined') return '';

  const hash = window.location.hash.slice(1); // Remove the #
  if (!hash) return '';

  try {
    const params = new URLSearchParams(hash);
    return params.get('url') || '';
  } catch {
    // Invalid hash format, ignore
  }
  return '';
}

export function UrlInput({ onSubmit, isLoading, disabled }: UrlInputProps) {
  // Initialize URL from hash (if present from extension)
  // Note: cookie-input.tsx handles clearing the hash
  const [url, setUrl] = useState(getInitialUrl);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError('Please enter a Substack URL');
      return;
    }

    if (!isValidUrl(trimmedUrl)) {
      setError('Please enter a valid URL (e.g., https://example.substack.com or https://lennysnewsletter.com)');
      return;
    }

    setError('');
    onSubmit(trimmedUrl);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError('');
            }}
            placeholder="https://example.substack.com or https://lennysnewsletter.com"
            disabled={isLoading || disabled}
            className="flex-1 px-4 py-3 text-base border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-zinc-100 disabled:cursor-not-allowed dark:bg-zinc-800 dark:border-zinc-600 dark:text-white dark:placeholder-zinc-400"
          />
          <button
            type="submit"
            disabled={isLoading || disabled}
            className="px-6 py-3 text-base font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Loading...' : 'Download'}
          </button>
        </div>
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
    </form>
  );
}
