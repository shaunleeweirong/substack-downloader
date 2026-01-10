'use client';

interface PaidContentNoticeProps {
  publicationName: string;
  onDismiss?: () => void;
}

export function PaidContentNotice({ publicationName, onDismiss }: PaidContentNoticeProps) {
  return (
    <div className="w-full max-w-xl p-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-900/20 dark:border-amber-800">
      <div className="flex items-start gap-3">
        <svg
          className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Subscriber-Only Content Detected
          </h3>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
            <strong>{publicationName}</strong> has subscriber-only content. To download all posts:
          </p>
          <ol className="mt-2 ml-4 text-sm text-amber-700 dark:text-amber-400 list-decimal space-y-1">
            <li>
              <a
                href="https://substack.com/sign-in"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-amber-800 dark:hover:text-amber-300"
              >
                Sign in to Substack
              </a>
              {' '}in your browser
            </li>
            <li>Verify you have an active subscription to this publication</li>
            <li>Return here and try downloading again</li>
          </ol>
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-500">
            Free posts will still be downloaded. Paid posts require a valid subscription.
          </p>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="mt-3 text-sm font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
            >
              Continue with free posts only
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
