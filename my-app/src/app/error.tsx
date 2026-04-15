'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App Error Boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">&#9888;</div>
        <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
        <p className="text-foreground-secondary text-sm mb-6">
          An unexpected error occurred. Please try again or return to the dashboard.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 text-sm font-medium text-white bg-accent-primary rounded-lg hover:bg-accent-primary/90 transition-colors"
          >
            Try Again
          </button>
          <a
            href="/"
            className="px-5 py-2.5 text-sm font-medium text-foreground-secondary border border-border rounded-lg hover:border-foreground-secondary/50 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
