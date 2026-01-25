'use client';

import { OutputFormat } from '@/lib/substack/types';

interface FormatSelectorProps {
  value: OutputFormat;
  onChange: (format: OutputFormat) => void;
  disabled?: boolean;
}

export function FormatSelector({ value, onChange, disabled }: FormatSelectorProps) {
  return (
    <div className="w-full max-w-md">
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
        Output Format
      </label>
      <div className="flex gap-4">
        <label
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
            value === 'markdown'
              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
              : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            type="radio"
            name="format"
            value="markdown"
            checked={value === 'markdown'}
            onChange={() => onChange('markdown')}
            disabled={disabled}
            className="sr-only"
          />
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <div>
            <div className="font-medium">Markdown (ZIP)</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Individual files</div>
          </div>
        </label>

        <label
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
            value === 'epub'
              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
              : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            type="radio"
            name="format"
            value="epub"
            checked={value === 'epub'}
            onChange={() => onChange('epub')}
            disabled={disabled}
            className="sr-only"
          />
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <div>
            <div className="font-medium">EPUB</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">eBook format</div>
          </div>
        </label>
      </div>
    </div>
  );
}
