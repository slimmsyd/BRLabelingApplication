/**
 * One-time "What's new" tips. Each feature gets a stable id so future
 * tips can ship without re-showing old ones.
 *
 * Persistence: localStorage via safeGetItem/safeSetItem (per browser).
 */

import { safeGetItem, safeSetItem } from '@/lib/client-utils';

/**
 * Flag for QC (form) + Flagged filter (EventLog) two-step tour.
 * Bumped to v2 when the form-panel step was added so prior dismissals re-run once.
 */
export const WHATS_NEW_FLAGGED_FILTER = 'whats_new:flagged_filter:v2';

export function hasSeenWhatsNew(featureId: string): boolean {
  return safeGetItem(featureId) === '1';
}

export function markWhatsNewSeen(featureId: string): void {
  safeSetItem(featureId, '1');
}
