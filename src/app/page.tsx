'use client';

import { useState, useCallback } from 'react';
import { UrlInput } from '@/components/url-input';
import { DateRangeFilter, DateRange } from '@/components/date-range-filter';
import { CookieInput } from '@/components/cookie-input';
import { ProgressBar } from '@/components/progress-bar';
import { DownloadButton } from '@/components/download-button';
import { ErrorMessage } from '@/components/error-message';
import { PaidContentNotice } from '@/components/paid-content-notice';
import { useDownload } from '@/hooks/use-download';

export default function Home() {
  const {
    progress,
    zipBlob,
    filename,
    error,
    isLoading,
    hasPaidContent,
    publicationName,
    startDownload,
    cancel,
    reset,
  } = useDownload();

  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [authCookie, setAuthCookie] = useState('');

  const handleDateRangeChange = useCallback((range: DateRange) => {
    setDateRange(range);
  }, []);

  const handleSubmit = (url: string) => {
    startDownload(url, dateRange, authCookie || undefined);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-900">
      <main className="w-full max-w-2xl flex flex-col items-center gap-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-white">
            Substack Archive Downloader
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-md">
            Download entire Substack publications as Markdown files for offline reading.
          </p>
        </div>

        {/* URL Input */}
        <UrlInput
          onSubmit={handleSubmit}
          isLoading={isLoading}
          disabled={!!zipBlob}
        />

        {/* Date Range Filter */}
        <DateRangeFilter
          onChange={handleDateRangeChange}
          disabled={isLoading || !!zipBlob}
        />

        {/* Cookie Input for Paid Content */}
        <CookieInput
          value={authCookie}
          onChange={setAuthCookie}
          disabled={isLoading || !!zipBlob}
        />

        {/* Paid Content Notice */}
        {hasPaidContent && !zipBlob && (
          <PaidContentNotice
            publicationName={publicationName}
            onDismiss={() => {}}
          />
        )}

        {/* Progress Bar */}
        {isLoading && progress && (
          <ProgressBar progress={progress} onCancel={cancel} />
        )}

        {/* Loading indicator when no progress yet */}
        {isLoading && !progress && (
          <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Connecting to Substack...</span>
          </div>
        )}

        {/* Error Message */}
        {error && !isLoading && (
          <ErrorMessage
            message={error}
            onRetry={reset}
            onDismiss={reset}
          />
        )}

        {/* Download Button */}
        {zipBlob && (
          <div className="flex flex-col items-center gap-4">
            <DownloadButton
              zipBlob={zipBlob}
              filename={filename}
              fileSize={zipBlob.size}
            />
            <button
              onClick={reset}
              className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline"
            >
              Download another publication
            </button>
          </div>
        )}

        {/* Instructions */}
        {!isLoading && !zipBlob && !error && (
          <div className="text-center text-sm text-zinc-500 dark:text-zinc-500 space-y-2 mt-4">
            <p>Paste a Substack publication URL to get started.</p>
            <p className="text-xs">
              Example: https://example.substack.com
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto pt-8 text-center text-xs text-zinc-400 dark:text-zinc-600">
        <p>
          Downloads text and images only. Audio/video content is not included.
        </p>
      </footer>
    </div>
  );
}
