'use client';

import { useEffect, useRef } from 'react';
import { isTypingTarget } from '@/lib/keyboard';
import {
  createInitialPunchTagState,
  expirePunchTagWindow,
  isPunchTagCode,
  isPunchTagModifierCode,
  nextPunchTagState,
  type PunchTagHotkeyState,
} from '@/lib/punch-tag/punch-tag-state';
import { generateId } from '@/lib/client-utils';
import type { PunchTagType } from '@/lib/event-helpers';
import type { HandCode, ResultCode, TargetName } from '@/lib/punch-fields';

export interface UsePunchTagHotkeysOptions {
  enabled: boolean;
  /** Hand, result, and target keys. Offense labeling leaves these off. */
  modifiersEnabled?: boolean;
  onCreateTag: (type: 'Punch', tagId: string) => void;
  onRefineTag: (tagId: string, type: PunchTagType) => void;
  onSetHand?: (tagId: string, hand: HandCode) => void;
  onSetResult?: (tagId: string, result: ResultCode) => void;
  onSetTarget?: (tagId: string, target: TargetName) => void;
  onUndoTag: () => void;
  onStateChange?: (state: PunchTagHotkeyState) => void;
}

/**
 * Window keydown listener for punch tagging (P + type letter + hand/result/target + Backspace).
 * Parent supplies create / refine / undo; this hook owns the refine window.
 * `dispatchCode` is the same path the keyboard uses, so on-screen keys stay in step.
 */
export function usePunchTagHotkeys({
  enabled,
  modifiersEnabled = false,
  onCreateTag,
  onRefineTag,
  onSetHand,
  onSetResult,
  onSetTarget,
  onUndoTag,
  onStateChange,
}: UsePunchTagHotkeysOptions): { dispatchCode: (code: string) => void } {
  const stateRef = useRef(createInitialPunchTagState());
  const callbacksRef = useRef({
    onCreateTag,
    onRefineTag,
    onSetHand,
    onSetResult,
    onSetTarget,
    onUndoTag,
    onStateChange,
  });
  const modifiersRef = useRef(modifiersEnabled);
  const enabledRef = useRef(enabled);
  const dispatchRef = useRef<(code: string) => void>(() => {});

  useEffect(() => {
    callbacksRef.current = {
      onCreateTag,
      onRefineTag,
      onSetHand,
      onSetResult,
      onSetTarget,
      onUndoTag,
      onStateChange,
    };
    modifiersRef.current = modifiersEnabled;
    enabledRef.current = enabled;
  });

  useEffect(() => {
    if (!enabled) {
      dispatchRef.current = () => {};
      return;
    }

    const publish = (next: PunchTagHotkeyState) => {
      stateRef.current = next;
      callbacksRef.current.onStateChange?.(next);
    };

    const apply = (code: string) => {
      const now = performance.now();
      publish(expirePunchTagWindow(stateRef.current, now));
      if (!isPunchTagCode(code)) return;
      if (!modifiersRef.current && isPunchTagModifierCode(code)) return;

      const newTagId = code === 'KeyP' ? generateId() : undefined;
      const { state: next, action } = nextPunchTagState(
        stateRef.current,
        code,
        now,
        newTagId,
      );
      publish(next);

      if (action.kind === 'create' && newTagId) {
        callbacksRef.current.onCreateTag(action.type, newTagId);
      } else if (action.kind === 'refine') {
        callbacksRef.current.onRefineTag(action.tagId, action.type);
      } else if (action.kind === 'setHand') {
        callbacksRef.current.onSetHand?.(action.tagId, action.hand);
      } else if (action.kind === 'setResult') {
        callbacksRef.current.onSetResult?.(action.tagId, action.result);
      } else if (action.kind === 'setTarget') {
        callbacksRef.current.onSetTarget?.(action.tagId, action.target);
      } else if (action.kind === 'undo') {
        callbacksRef.current.onUndoTag();
      }
    };

    dispatchRef.current = apply;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!enabledRef.current) return;
      if (isTypingTarget(document.activeElement)) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      if (!isPunchTagCode(event.code)) return;
      if (!modifiersRef.current && isPunchTagModifierCode(event.code)) return;

      event.preventDefault();
      apply(event.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    const tick = window.setInterval(() => {
      const now = performance.now();
      const next = expirePunchTagWindow(stateRef.current, now);
      if (next !== stateRef.current) publish(next);
    }, 50);

    return () => {
      dispatchRef.current = () => {};
      window.removeEventListener('keydown', handleKeyDown);
      window.clearInterval(tick);
    };
  }, [enabled]);

  return {
    dispatchCode: (code: string) => dispatchRef.current(code),
  };
}
