/**
 * Per-punch fields for Offense punches made with the P hotkey.
 *
 * Each new punch starts with no result and no target. I/M and 1/2 change
 * only the punch they point at, as often as the labeler likes. They never
 * write into the sidebar form, so one punch's result or target cannot carry
 * over to the next punch.
 */

import type { ResultCode, TargetName } from '@/lib/punch-fields';

export interface HotkeyPunchFields {
  target: string;
  punchResult?: string;
  landed?: boolean;
}

/** Result and target for a punch just created with P. Both start unset. */
export function freshHotkeyPunchFields(): HotkeyPunchFields {
  return { target: '', punchResult: undefined, landed: undefined };
}

/**
 * Apply I or M to one punch. Punches already stored as I/M codes keep codes;
 * everything else (blank, Landed, Missed, Defended, ...) is written as
 * Landed or Missed, the words Offense labels use.
 */
export function withHotkeyResult<T extends HotkeyPunchFields>(event: T, result: ResultCode): T {
  const usesCode = event.punchResult === 'I' || event.punchResult === 'M';
  const punchResult = result === 'I' ? (usesCode ? 'I' : 'Landed') : (usesCode ? 'M' : 'Missed');
  return { ...event, punchResult, landed: result === 'I' };
}

/** Apply 1 (Head) or 2 (Body) to one punch. */
export function withHotkeyTarget<T extends HotkeyPunchFields>(event: T, target: TargetName): T {
  return { ...event, target };
}

/**
 * Which punch L/R, I/M, and 1/2 edit in Offense labeling.
 * `pinnedId` is the punch the labeler last made with P or opened in the
 * sidebar. It wins over the hotkey reducer's own pick, which only knows
 * punches made with P.
 */
export function offenseKeyTarget(reducerTagId: string, pinnedId: string | null): string {
  return pinnedId || reducerTagId;
}

/**
 * The sidebar form mirrors a punch only while that punch is open for editing
 * there. Otherwise a key press must leave the form alone.
 */
export function hotkeyEditMirrorsForm(tagId: string, selectedEventId: string | null): boolean {
  return selectedEventId !== null && selectedEventId === tagId;
}
