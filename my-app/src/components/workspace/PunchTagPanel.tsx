'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { PUNCH_TAG_REFINE_WINDOW_MS } from '@/lib/event-helpers';
import { hasSeenWhatsNew, markWhatsNewSeen, WHATS_NEW_PUNCH_TAG } from '@/lib/whats-new';
import type { PunchTagHotkeyState } from '@/lib/punch-tag/punch-tag-state';

const KEY_LEGEND: { letter: string; name: string; wide?: boolean }[] = [
  { letter: 'P', name: 'Punch happened', wide: true },
  { letter: 'J', name: 'Jab' },
  { letter: 'C', name: 'Cross' },
  { letter: 'H', name: 'Hook' },
  { letter: 'U', name: 'Uppercut' },
  { letter: 'O', name: 'Overhand' },
  { letter: 'S', name: 'Screwshot' },
];

interface PunchTagPanelProps {
  hotkeyState: PunchTagHotkeyState;
  tagCount: number;
  recording: boolean;
  readOnly?: boolean;
  nowMs?: number;
}

export default function PunchTagPanel({
  hotkeyState,
  tagCount,
  recording,
  readOnly = false,
  nowMs,
}: PunchTagPanelProps) {
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!hasSeenWhatsNew(WHATS_NEW_PUNCH_TAG)) setShowWhatsNew(true);
  }, []);

  useEffect(() => {
    if (!hotkeyState.refineWindow) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 50);
    return () => window.clearInterval(id);
  }, [hotkeyState.refineWindow]);

  const dismissWhatsNew = () => {
    markWhatsNewSeen(WHATS_NEW_PUNCH_TAG);
    setShowWhatsNew(false);
  };

  const windowOpen =
    hotkeyState.refineWindow &&
    (nowMs ?? performance.now()) < hotkeyState.refineWindow.expiresAt;
  const remainingMs = windowOpen && hotkeyState.refineWindow
    ? Math.max(0, hotkeyState.refineWindow.expiresAt - (nowMs ?? performance.now()))
    : 0;
  const barRatio = windowOpen ? remainingMs / PUNCH_TAG_REFINE_WINDOW_MS : 0;
  void tick;

  const lastKey = hotkeyState.lastKey;
  const lastType = hotkeyState.lastType;

  return (
    <div className="relative flex flex-col gap-3 h-full min-h-0">
      <h2 className="text-sm font-semibold text-foreground">Punch tagging</h2>

      {showWhatsNew && (
        <div
          className="absolute top-8 left-0 right-0 z-10 rounded-xl border border-border bg-[#242424] p-3.5 shadow-xl shadow-black/40"
          role="dialog"
          aria-labelledby="punch-tag-whats-new-title"
        >
          <button
            type="button"
            onClick={dismissWhatsNew}
            className="absolute top-2 right-2 w-7 h-7 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-surface-hover flex items-center justify-center cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
          <p
            id="punch-tag-whats-new-title"
            className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-2 pr-8"
          >
            What&apos;s new
          </p>
          <p className="text-sm text-foreground leading-relaxed mb-3">
            Press P when a punch happens. Within 1.5 seconds press J, C, H, U, O, or S to set the type.
            A second letter in that window replaces the first. Backspace removes the newest tag.
          </p>
          <button
            type="button"
            onClick={dismissWhatsNew}
            className="w-full py-2 px-3 rounded-lg border border-border bg-surface hover:bg-surface-hover text-xs font-medium text-foreground cursor-pointer"
          >
            Got it
          </button>
        </div>
      )}

      <div
        className={`rounded-xl border p-4 min-h-[118px] flex flex-col justify-center gap-2 ${
          windowOpen
            ? 'border-accent-primary/70 bg-[#172033]'
            : 'border-border bg-surface'
        }`}
      >
        {lastKey && lastType ? (
          <div className="flex items-baseline gap-2.5">
            <span className="font-mono text-3xl font-bold leading-none">{lastKey}</span>
            <span className="text-foreground-tertiary text-lg">→</span>
            <span className="text-xl font-semibold">{lastType}</span>
          </div>
        ) : (
          <p className="text-xs text-foreground-secondary">Press P when a punch happens</p>
        )}
        <p className="text-xs text-foreground-secondary">
          {windowOpen
            ? `Type a letter to set the punch. ${(remainingMs / 1000).toFixed(1)}s left.`
            : hotkeyState.hint || (lastType ? 'Window closed. Press P for the next punch.' : '')}
        </p>
        {windowOpen && (
          <div className="h-1 rounded-full bg-border overflow-hidden">
            <div
              className="h-full bg-accent-primary transition-[width] duration-75"
              style={{ width: `${barRatio * 100}%` }}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {KEY_LEGEND.map((item) => (
          <div
            key={item.letter}
            className={`rounded-lg border border-border bg-surface px-2 py-2.5 ${
              item.wide ? 'col-span-3' : ''
            } ${lastKey === item.letter && windowOpen ? 'border-accent-primary bg-accent-glow' : ''} ${
              !recording || readOnly ? 'opacity-40' : ''
            }`}
          >
            <span className="font-mono text-sm font-bold text-accent-primary">{item.letter}</span>
            <span className="block text-[11px] text-foreground-secondary mt-0.5">{item.name}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-foreground-secondary">
        {tagCount === 1 ? '1 tag' : `${tagCount} tags`}
      </p>

      {!recording && !readOnly && (
        <p className="text-xs text-blue-400">Start Recording to tag punches.</p>
      )}
      {readOnly && (
        <p className="text-xs text-foreground-tertiary">This assignment is read-only.</p>
      )}
    </div>
  );
}
