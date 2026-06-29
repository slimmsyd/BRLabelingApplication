'use client';

import React from 'react';
import { Archive, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ArchivedVideoOverlayProps {
  title?: string;
  variant?: 'modal' | 'page';
  onClose?: () => void;
}

/**
 * Shown when a user tries to open a video whose storage files have been archived.
 */
export default function ArchivedVideoOverlay({
  title,
  variant = 'page',
  onClose,
}: ArchivedVideoOverlayProps) {
  const content = (
    <div className="text-center max-w-md px-6">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
        <Archive size={28} className="text-amber-500" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Video is no longer available
      </h2>
      <p className="text-foreground-secondary text-sm leading-relaxed mb-1">
        It has been archived to free storage space. Your labeling data for this
        round is still preserved.
      </p>
      {title && (
        <p className="text-foreground-tertiary text-xs mt-4 font-medium">{title}</p>
      )}
      {variant === 'page' ? (
        <Link
          href="/"
          className="inline-flex items-center gap-2 mt-8 text-sm text-accent-primary hover:underline"
        >
          <ArrowLeft size={16} />
          Return to Dashboard
        </Link>
      ) : (
        <button
          type="button"
          onClick={onClose}
          className="mt-8 px-5 py-2.5 rounded-lg bg-surface-hover border border-border text-sm text-foreground hover:bg-white/5 transition-colors"
        >
          Got it
        </button>
      )}
    </div>
  );

  if (variant === 'modal') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="bg-surface border border-border rounded-2xl shadow-2xl py-10 px-4"
          onClick={(e) => e.stopPropagation()}
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      {content}
    </div>
  );
}