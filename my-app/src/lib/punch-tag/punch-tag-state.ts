/**
 * Pure key-sequence reducer for punch tagging.
 * No React / DOM — unit-testable via scripts/verify-punch-tag-state.ts.
 */

import {
  PUNCH_TAG_KEY_MAP,
  PUNCH_TAG_REFINE_WINDOW_MS,
  type PunchTagType,
} from '@/lib/event-helpers';
import type { HandCode, ResultCode, TargetName } from '@/lib/punch-fields';

export interface PunchTagWindow {
  tagId: string;
  openedAt: number;
  expiresAt: number;
}

export interface PunchTagHotkeyState {
  refineWindow: PunchTagWindow | null;
  /** Newest tag last. Hand, result, and target keys edit the top of this stack. */
  tagStack: string[];
  lastKey: string | null;
  lastType: PunchTagType | null;
  lastHand: HandCode | null;
  lastResult: ResultCode | null;
  lastTarget: TargetName | null;
  hint: string | null;
}

export type PunchTagAction =
  | { kind: 'create'; type: 'Punch' }
  | { kind: 'refine'; tagId: string; type: PunchTagType }
  | { kind: 'setHand'; tagId: string; hand: HandCode }
  | { kind: 'setResult'; tagId: string; result: ResultCode }
  | { kind: 'setTarget'; tagId: string; target: TargetName }
  | { kind: 'undo' }
  | { kind: 'ignore' }
  | { kind: 'hint'; message: string };

export interface PunchTagReducerResult {
  state: PunchTagHotkeyState;
  action: PunchTagAction;
}

type ModifierSpec =
  | { kind: 'setHand'; hand: HandCode }
  | { kind: 'setResult'; result: ResultCode }
  | { kind: 'setTarget'; target: TargetName };

const MODIFIER_CODES: Record<string, ModifierSpec> = {
  KeyL: { kind: 'setHand', hand: 'L' },
  KeyR: { kind: 'setHand', hand: 'R' },
  KeyI: { kind: 'setResult', result: 'I' },
  KeyM: { kind: 'setResult', result: 'M' },
  Digit1: { kind: 'setTarget', target: 'Head' },
  Numpad1: { kind: 'setTarget', target: 'Head' },
  Digit2: { kind: 'setTarget', target: 'Body' },
  Numpad2: { kind: 'setTarget', target: 'Body' },
};

const TYPE_CODES = new Set(Object.keys(PUNCH_TAG_KEY_MAP));

export function isPunchTagModifierCode(code: string): boolean {
  return code in MODIFIER_CODES;
}

export function isPunchTagCode(code: string): boolean {
  return code === 'KeyP' || code === 'Backspace' || TYPE_CODES.has(code) || isPunchTagModifierCode(code);
}

export function createInitialPunchTagState(): PunchTagHotkeyState {
  return {
    refineWindow: null,
    tagStack: [],
    lastKey: null,
    lastType: null,
    lastHand: null,
    lastResult: null,
    lastTarget: null,
    hint: null,
  };
}

function windowIsOpen(window: PunchTagWindow | null, now: number): boolean {
  return Boolean(window && now < window.expiresAt);
}

function modifierKeyLabel(code: string): string {
  if (code === 'Digit1' || code === 'Numpad1') return '1';
  if (code === 'Digit2' || code === 'Numpad2') return '2';
  return code.replace('Key', '');
}

function withActiveTag(state: PunchTagHotkeyState, code: string): PunchTagReducerResult {
  const tagId = state.tagStack[state.tagStack.length - 1];
  const template = MODIFIER_CODES[code];
  if (!tagId || !template) {
    return {
      state: {
        ...state,
        lastKey: modifierKeyLabel(code),
        hint: 'Press P first',
      },
      action: { kind: 'hint', message: 'Press P first' },
    };
  }

  const letter = modifierKeyLabel(code);
  if (template.kind === 'setHand') {
    return {
      state: { ...state, lastKey: letter, lastHand: template.hand, hint: null },
      action: { kind: 'setHand', tagId, hand: template.hand },
    };
  }
  if (template.kind === 'setResult') {
    return {
      state: { ...state, lastKey: letter, lastResult: template.result, hint: null },
      action: { kind: 'setResult', tagId, result: template.result },
    };
  }
  return {
    state: { ...state, lastKey: letter, lastTarget: template.target, hint: null },
    action: { kind: 'setTarget', tagId, target: template.target },
  };
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
      tagStack: [...state.tagStack, tagId],
      lastKey: 'P',
      lastType: 'Punch',
      lastHand: null,
      lastResult: null,
      lastTarget: null,
      hint: null,
    };
    return { state: next, action: { kind: 'create', type: 'Punch' } };
  }

  if (code === 'Backspace') {
    return {
      state: {
        ...state,
        refineWindow: null,
        tagStack: state.tagStack.slice(0, -1),
        lastKey: null,
        lastType: null,
        lastHand: null,
        lastResult: null,
        lastTarget: null,
        hint: null,
      },
      action: { kind: 'undo' },
    };
  }

  if (isPunchTagModifierCode(code)) {
    return withActiveTag(state, code);
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
        tagStack: state.tagStack,
        lastKey: letter,
        lastType: type,
        lastHand: state.lastHand,
        lastResult: state.lastResult,
        lastTarget: state.lastTarget,
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
