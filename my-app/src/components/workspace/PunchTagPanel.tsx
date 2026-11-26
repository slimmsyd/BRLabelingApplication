'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { PUNCH_TAG_REFINE_WINDOW_MS } from '@/lib/event-helpers';
import type { PunchTagHotkeyState } from '@/lib/punch-tag/punch-tag-state';

const HOTKEY_TIP_SESSION_KEY = 'hotkeys_tip_session';

function readHotkeyTipDismissed(): boolean {
  try {
    return sessionStorage.getItem(HOTKEY_TIP_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function dismissHotkeyTipSession(): void {
  try {
    sessionStorage.setItem(HOTKEY_TIP_SESSION_KEY, '1');
  } catch {
    // Private mode can block storage. Closing the tip still hides it until reload.
  }
}

/** Shown once per browser session, next to the hotkeys. Gone for the rest of that session after dismiss. */
export function HotkeySessionTip() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!readHotkeyTipDismissed()) setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dismissHotkeyTipSession();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  const close = () => {
    dismissHotkeyTipSession();
    setOpen(false);
  };

  return (
    <div className="relative mb-2" role="status">
      <div className="rounded-xl border border-accent-primary/40 bg-[#172033] p-3 pr-8 shadow-lg shadow-black/30">
        <button
          type="button"
          onClick={close}
          className="absolute top-2 right-2 w-6 h-6 rounded-md text-foreground-secondary hover:text-foreground hover:bg-surface-hover flex items-center justify-center cursor-pointer"
          aria-label="Close hotkey tip"
        >
          <X size={14} />
        </button>
        <p className="text-[10px] font-bold uppercase tracking-wider text-accent-primary mb-1.5">
          Hotkeys
        </p>
        <p className="text-xs text-foreground leading-relaxed">
          Press <span className="font-mono font-bold">P</span> when a punch happens.
          Within 1.5 seconds press <span className="font-mono font-bold">J</span> Jab,{' '}
          <span className="font-mono font-bold">C</span> Cross,{' '}
          <span className="font-mono font-bold">H</span> Hook,{' '}
          <span className="font-mono font-bold">U</span> Uppercut,{' '}
          <span className="font-mono font-bold">O</span> Overhand, or{' '}
          <span className="font-mono font-bold">S</span> Screwshot.
          Then <span className="font-mono font-bold">L</span>/<span className="font-mono font-bold">R</span> hand,{' '}
          <span className="font-mono font-bold">I</span> impact or <span className="font-mono font-bold">M</span> missed,{' '}
          <span className="font-mono font-bold">1</span> head or <span className="font-mono font-bold">2</span> body.
          Those still apply to the latest punch after the window closes.
          Backspace removes the latest punch. Start Recording first.
        </p>
        <button
          type="button"
          onClick={close}
          className="mt-2.5 w-full py-1.5 px-3 rounded-lg bg-accent-primary text-white text-xs font-medium cursor-pointer"
        >
          Got it
        </button>
      </div>
      <div className="mx-auto h-2 w-2 -mt-1 rotate-45 border-r border-b border-accent-primary/40 bg-[#172033]" />
    </div>
  );
}

const KEY_LEGEND: { letter: string; name: string; code: string; wide?: boolean }[] = [
  { letter: 'P', name: 'Punch happened', code: 'KeyP', wide: true },
  { letter: 'J', name: 'Jab', code: 'KeyJ' },
  { letter: 'C', name: 'Cross', code: 'KeyC' },
  { letter: 'H', name: 'Hook', code: 'KeyH' },
  { letter: 'U', name: 'Uppercut', code: 'KeyU' },
  { letter: 'O', name: 'Overhand', code: 'KeyO' },
  { letter: 'S', name: 'Screwshot', code: 'KeyS' },
];

const FIELD_LEGEND: { letter: string; name: string; code: string }[] = [
  { letter: 'L', name: 'Left hand', code: 'KeyL' },
  { letter: 'R', name: 'Right hand', code: 'KeyR' },
  { letter: 'I', name: 'Impact', code: 'KeyI' },
  { letter: 'M', name: 'Missed', code: 'KeyM' },
  { letter: '1', name: 'Head', code: 'Digit1' },
  { letter: '2', name: 'Body', code: 'Digit2' },
];

interface PunchTagPanelProps {
  hotkeyState: PunchTagHotkeyState;
  tagCount: number;
  recording: boolean;
  readOnly?: boolean;
  nowMs?: number;
  /** Same path as the keyboard, so the on-screen keys tag the latest punch. */
  onDispatchCode?: (code: string) => void;
}

function fieldSummary(state: PunchTagHotkeyState): string {
  const bits = [state.lastHand, state.lastResult, state.lastTarget].filter(Boolean);
  return bits.join(' ');
}

export default function PunchTagPanel({
  hotkeyState,
  tagCount,
  recording,
  readOnly = false,
  nowMs,
  onDispatchCode,
}: PunchTagPanelProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!hotkeyState.refineWindow) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 50);
    return () => window.clearInterval(id);
  }, [hotkeyState.refineWindow]);

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
      <HotkeySessionTip />

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
            {fieldSummary(hotkeyState) && (
              <span className="text-sm font-medium text-foreground-secondary">{fieldSummary(hotkeyState)}</span>
            )}
          </div>
        ) : (
          <p className="text-xs text-foreground-secondary">Press P when a punch happens</p>
        )}
        <p className="text-xs text-foreground-secondary">
          {windowOpen
            ? `Type a letter to set the punch. L/R hand, I/M result, 1 head, 2 body. ${(remainingMs / 1000).toFixed(1)}s left.`
            : hotkeyState.hint || (lastType ? 'Window closed. L/R, I/M, 1, and 2 still edit the latest punch. Press P for the next one.' : '')}
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
          <button
            key={item.letter}
            type="button"
            disabled={!recording || readOnly}
            onClick={() => onDispatchCode?.(item.code)}
            className={`rounded-lg border border-border bg-surface px-2 py-2.5 text-left cursor-pointer disabled:cursor-default ${
              item.wide ? 'col-span-3' : ''
            } ${lastKey === item.letter && windowOpen ? 'border-accent-primary bg-accent-glow' : ''} ${
              !recording || readOnly ? 'opacity-40' : ''
            }`}
          >
            <span className="font-mono text-sm font-bold text-accent-primary">{item.letter}</span>
            <span className="block text-[11px] text-foreground-secondary mt-0.5">{item.name}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {FIELD_LEGEND.map((item) => {
          const selected =
            hotkeyState.lastHand === item.letter ||
            hotkeyState.lastResult === item.letter ||
            (item.letter === '1' && hotkeyState.lastTarget === 'Head') ||
            (item.letter === '2' && hotkeyState.lastTarget === 'Body');
          return (
            <button
              key={item.letter}
              type="button"
              disabled={!recording || readOnly || hotkeyState.tagStack.length === 0}
              onClick={() => onDispatchCode?.(item.code)}
              className={`rounded-lg border border-border bg-surface px-2 py-2 text-left cursor-pointer disabled:cursor-default ${
                selected ? 'border-accent-primary bg-accent-glow' : ''
              } ${!recording || readOnly ? 'opacity-40' : ''}`}
            >
              <span className="font-mono text-sm font-bold text-accent-primary">{item.letter}</span>
              <span className="block text-[11px] text-foreground-secondary mt-0.5">{item.name}</span>
            </button>
          );
        })}
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

/** Compact key row for the full labeling form. The form stays; these keys log on top of it. */
export function PunchTagKeyStrip({
  hotkeyState,
  recording,
  readOnly = false,
  nowMs,
}: PunchTagPanelProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!hotkeyState.refineWindow) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 50);
    return () => window.clearInterval(id);
  }, [hotkeyState.refineWindow]);

  const windowOpen =
    hotkeyState.refineWindow &&
    (nowMs ?? performance.now()) < hotkeyState.refineWindow.expiresAt;
  const remainingMs = windowOpen && hotkeyState.refineWindow
    ? Math.max(0, hotkeyState.refineWindow.expiresAt - (nowMs ?? performance.now()))
    : 0;
  void tick;

  const status = !recording && !readOnly
    ? 'Start Recording, then press P when a punch happens.'
    : readOnly
      ? 'Hotkeys are off while this round is read-only.'
      : windowOpen
        ? `Press J, C, H, U, O, or S. ${(remainingMs / 1000).toFixed(1)}s left.`
        : hotkeyState.hint || 'P logs the punch. A letter within 1.5s sets the type.';

  return (
    <div className="shrink-0">
      <HotkeySessionTip />
      <div className={!recording || readOnly ? 'opacity-50' : ''}>
        <div className="flex flex-wrap gap-1">
          {KEY_LEGEND.map((item) => (
            <span
              key={item.letter}
              className={`inline-flex items-center gap-1 rounded-md border border-border bg-surface px-1.5 py-1 ${
                hotkeyState.lastKey === item.letter && windowOpen ? 'border-accent-primary bg-accent-glow' : ''
              }`}
            >
              <span className="font-mono text-[11px] font-bold text-accent-primary">{item.letter}</span>
              <span className="text-[10px] text-foreground-secondary">{item.name}</span>
            </span>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-foreground-secondary">{status}</p>
      </div>
    </div>
  );
}
