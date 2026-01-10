'use client';

import { DownloadProgress } from '@/lib/substack/types';

interface ProgressBarProps {
  progress: DownloadProgress;
  onCancel?: () => void;
}

const statusMessages: Record<DownloadProgress['status'], string> = {
  fetching: 'Fetching posts...',
  processing: 'Processing content...',
  'downloading-images': 'Downloading images...',
  'creating-zip': 'Creating archive...',
  complete: 'Download complete!',
  error: 'An error occurred',
};

export function ProgressBar({ progress, onCancel }: ProgressBarProps) {
  const { currentPost, processedPosts, totalPosts, percentage, status, error } = progress;

  return (
    <div className="w-full max-w-xl space-y-4">
      {/* Progress bar */}
      <div className="relative">
        <div className="h-3 bg-zinc-200 rounded-full overflow-hidden dark:bg-zinc-700">
          <div
            className="h-full bg-orange-500 transition-all duration-300 ease-out"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Status info */}
      <div className="flex justify-between items-center text-sm">
        <div className="flex flex-col gap-1">
          <span className="text-zinc-600 dark:text-zinc-400">
            {statusMessages[status]}
          </span>
          {currentPost && status !== 'complete' && status !== 'error' && (
            <span className="text-zinc-500 dark:text-zinc-500 truncate max-w-xs">
              {currentPost}
            </span>
          )}
          {error && (
            <span className="text-red-500">{error}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-zinc-600 dark:text-zinc-400">
            {processedPosts} / {totalPosts} posts
          </span>
          {onCancel && status !== 'complete' && status !== 'error' && (
            <button
              onClick={onCancel}
              className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
