/**
 * Pure key-sequence reducer for punch tagging.
 * No React / DOM — unit-testable via scripts/verify-punch-tag-state.ts.
 */

import {
  PUNCH_TAG_KEY_MAP,
  PUNCH_TAG_REFINE_WINDOW_MS,
  type PunchTagType,
} from '@/lib/event-helpers';

export interface PunchTagWindow {
  tagId: string;
  openedAt: number;
  expiresAt: number;
}

export interface PunchTagHotkeyState {
  refineWindow: PunchTagWindow | null;
  lastKey: string | null;
  lastType: PunchTagType | null;
  hint: string | null;
}

export type PunchTagAction =
  | { kind: 'create'; type: 'Punch' }
  | { kind: 'refine'; tagId: string; type: PunchTagType }
  | { kind: 'undo' }
  | { kind: 'ignore' }
  | { kind: 'hint'; message: string };

export interface PunchTagReducerResult {
  state: PunchTagHotkeyState;
  action: PunchTagAction;
}

export function createInitialPunchTagState(): PunchTagHotkeyState {
  return {
    refineWindow: null,
    lastKey: null,
    lastType: null,
    hint: null,
  };
}

function windowIsOpen(window: PunchTagWindow | null, now: number): boolean {
  return Boolean(window && now < window.expiresAt);
}

/**
 * Apply one keydown. `code` is KeyboardEvent.code (KeyP, KeyU, Backspace, …).
 * Callers must already filter typing targets, modifiers, and editability.
 */
export function nextPunchTagState(
  state: PunchTagHotkeyState,
  code: string,
  now: number,
  /** Id of the tag that will be created when action is create; ignored otherwise. */
  newTagId?: string,
): PunchTagReducerResult {
  if (code === 'KeyP') {
    const tagId = newTagId || `pending-${now}`;
    const next: PunchTagHotkeyState = {
      refineWindow: {
        tagId,
        openedAt: now,
        expiresAt: now + PUNCH_TAG_REFINE_WINDOW_MS,
      },
      lastKey: 'P',
      lastType: 'Punch',
      hint: null,
    };
    return { state: next, action: { kind: 'create', type: 'Punch' } };
  }

  if (code === 'Backspace') {
    return {
      state: {
        ...state,
        refineWindow: null,
        lastKey: null,
        lastType: null,
        hint: null,
      },
      action: { kind: 'undo' },
    };
  }

  const type = PUNCH_TAG_KEY_MAP[code];
  if (type) {
    const letter = code.replace('Key', '');
    if (!windowIsOpen(state.refineWindow, now) || !state.refineWindow) {
      return {
        state: {
          ...state,
          lastKey: letter,
          lastType: null,
          hint: 'Press P first',
        },
        action: { kind: 'hint', message: 'Press P first' },
      };
    }
    return {
      state: {
        refineWindow: {
          ...state.refineWindow,
          // Keep the same expiry so later letters can still refine within the window
        },
        lastKey: letter,
        lastType: type,
        hint: null,
      },
      action: {
        kind: 'refine',
        tagId: state.refineWindow.tagId,
        type,
      },
    };
  }

  return { state, action: { kind: 'ignore' } };
}

/** Clear the refine window once its timer has elapsed (call from a tick / effect). */
export function expirePunchTagWindow(
  state: PunchTagHotkeyState,
  now: number,
): PunchTagHotkeyState {
  if (!state.refineWindow) return state;
  if (now < state.refineWindow.expiresAt) return state;
  return { ...state, refineWindow: null };
}
