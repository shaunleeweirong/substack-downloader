'use client';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorMessage({ message, onRetry, onDismiss }: ErrorMessageProps) {
  return (
    <div className="w-full max-w-xl p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
      <div className="flex items-start gap-3">
        <svg
          className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="flex-1">
          <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
          <div className="flex gap-3 mt-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Try again
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
