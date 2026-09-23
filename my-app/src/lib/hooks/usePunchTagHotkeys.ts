'use client';

import { useEffect, useRef } from 'react';
import { isTypingTarget } from '@/lib/keyboard';
import {
  createInitialPunchTagState,
  expirePunchTagWindow,
  nextPunchTagState,
  type PunchTagHotkeyState,
} from '@/lib/punch-tag/punch-tag-state';
import { generateId } from '@/lib/client-utils';
import type { PunchTagType } from '@/lib/event-helpers';

export interface UsePunchTagHotkeysOptions {
  enabled: boolean;
  onCreateTag: (type: 'Punch', tagId: string) => void;
  onRefineTag: (tagId: string, type: PunchTagType) => void;
  onUndoTag: () => void;
  onStateChange?: (state: PunchTagHotkeyState) => void;
}

/**
 * Window keydown listener for punch tagging (P + type letter + Backspace).
 * Parent supplies create / refine / undo; this hook owns the refine window.
 */
export function usePunchTagHotkeys({
  enabled,
  onCreateTag,
  onRefineTag,
  onUndoTag,
  onStateChange,
}: UsePunchTagHotkeysOptions) {
  const stateRef = useRef(createInitialPunchTagState());
  const callbacksRef = useRef({ onCreateTag, onRefineTag, onUndoTag, onStateChange });
  callbacksRef.current = { onCreateTag, onRefineTag, onUndoTag, onStateChange };

  useEffect(() => {
    if (!enabled) return;

    const publish = (next: PunchTagHotkeyState) => {
      stateRef.current = next;
      callbacksRef.current.onStateChange?.(next);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!enabled) return;
      if (isTypingTarget(document.activeElement)) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;

      const now = performance.now();
      // Expire stale window before applying the key
      publish(expirePunchTagWindow(stateRef.current, now));

      if (
        e.code !== 'KeyP' &&
        e.code !== 'Backspace' &&
        !e.code.startsWith('Key')
      ) {
        return;
      }

      // Only handle punch-tag codes
      const isPunchCode =
        e.code === 'KeyP' ||
        e.code === 'Backspace' ||
        ['KeyJ', 'KeyC', 'KeyH', 'KeyU', 'KeyO', 'KeyS'].includes(e.code);
      if (!isPunchCode) return;

      e.preventDefault();

      const newTagId = e.code === 'KeyP' ? generateId() : undefined;
      const { state: next, action } = nextPunchTagState(
        stateRef.current,
        e.code,
        now,
        newTagId,
      );
      publish(next);

      if (action.kind === 'create' && newTagId) {
        callbacksRef.current.onCreateTag(action.type, newTagId);
      } else if (action.kind === 'refine') {
        callbacksRef.current.onRefineTag(action.tagId, action.type);
      } else if (action.kind === 'undo') {
        callbacksRef.current.onUndoTag();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const tick = window.setInterval(() => {
      const now = performance.now();
      const next = expirePunchTagWindow(stateRef.current, now);
      if (next !== stateRef.current) publish(next);
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.clearInterval(tick);
    };
  }, [enabled]);
}
