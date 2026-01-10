'use client';

import { useState } from 'react';
import { SUBSTACK_URL_PATTERN } from '@/lib/constants';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function UrlInput({ onSubmit, isLoading, disabled }: UrlInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const validateUrl = (value: string): boolean => {
    return SUBSTACK_URL_PATTERN.test(value.trim());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError('Please enter a Substack URL');
      return;
    }

    if (!validateUrl(trimmedUrl)) {
      setError('Please enter a valid Substack URL (e.g., https://example.substack.com or https://substack.com/@example)');
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
            placeholder="https://example.substack.com"
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
