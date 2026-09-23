/**
 * Helpers for Event save logic.
 *
 * The events save endpoint (POST /api/videos/[id]/events) uses a
 * "replace strategy": deleteMany + createMany on every save. The DB
 * column `Event.createdAt` has `@default(now())`, so without explicit
 * timestamps every QC re-save would stamp the row with "now" — and
 * the weekly productivity export filters by `createdAt`, so old
 * rounds would leak into the current week any time a QC reviewer
 * touched them. See:
 *   my-app/src/app/api/admin/export-events/route.ts (date filter)
 *   my-app/src/app/api/videos/[id]/events/route.ts (save endpoint)
 */

/** Allowed punch result values for offense labeling. */
export const PUNCH_RESULTS = ['Landed', 'Missed', 'Unseen', 'Defended', 'Illegal'] as const;
export type PunchResult = (typeof PUNCH_RESULTS)[number];

/** Allowed punch types for Punch Tag assignments (includes generic Punch). */
export const PUNCH_TAG_TYPES = [
  'Punch',
  'Jab',
  'Cross',
  'Hook',
  'Uppercut',
  'Overhand',
  'Screwshot',
] as const;
export type PunchTagType = (typeof PUNCH_TAG_TYPES)[number];

/** KeyboardEvent.code → punch type for the refine window after P. */
export const PUNCH_TAG_KEY_MAP: Record<string, PunchTagType> = {
  KeyJ: 'Jab',
  KeyC: 'Cross',
  KeyH: 'Hook',
  KeyU: 'Uppercut',
  KeyO: 'Overhand',
  KeyS: 'Screwshot',
};

/** How long after P a type letter may refine the same tag. */
export const PUNCH_TAG_REFINE_WINDOW_MS = 1500;

export function isLandedPunchResult(
  punchResult: string | null | undefined,
  landed?: boolean | null,
): boolean {
  if (punchResult) return punchResult === 'Landed';
  return landed !== false;
}

export interface ExistingEvent {
  startTime: string;
  createdAt: Date;
}

export interface IncomingEvent {
  startTime: string;
  endTime: string;
  boxer: string;
  punchType: string;
  hand: string;
  target: string;
  visibilityFlags: string[];
  knockdown: boolean;
  punchQuality: string;
  cam?: string | null;
  stance?: string | null;
  landed?: boolean | null;
  punchResult?: string | null;
  defenseType?: string | null;
  flagged?: boolean | null;
  labeledBy?: string | null;
  labeledByEmail?: string | null;
  fightTitle?: string | null;
}

export interface EventInsertRow {
  assignmentId: string;
  startTime: string;
  endTime: string;
  boxer: string;
  punchType: string;
  hand: string;
  target: string;
  visibilityFlags: string[];
  knockdown: boolean;
  punchQuality: string;
  cam: string | null;
  stance: string | null;
  landed: boolean | null;
  punchResult: string | null;
  defenseType: string | null;
  flagged: boolean;
  labeledBy: string | null;
  labeledByEmail: string | null;
  fightTitle: string;
  createdAt: Date;
}

/**
 * Build the `createMany` payload for the events save endpoint while
 * preserving the original `createdAt` for any event whose `startTime`
 * matches a pre-existing row in the same assignment. Genuinely new
 * events (no `startTime` match) get the `now` timestamp.
 *
 * Defensive against duplicate startTimes in the existing rows: the
 * earliest `createdAt` wins for that key.
 */
export function computeEventRowsWithPreservedTimestamps(
  existing: ExistingEvent[],
  incoming: IncomingEvent[],
  assignmentId: string,
  now: Date,
  fallbackFightTitle: string,
): EventInsertRow[] {
  const createdAtByStart = new Map<string, Date>();
  for (const e of existing) {
    const prior = createdAtByStart.get(e.startTime);
    if (!prior || e.createdAt < prior) {
      createdAtByStart.set(e.startTime, e.createdAt);
    }
  }

  return incoming.map((event) => ({
    assignmentId,
    startTime: event.startTime,
    endTime: event.endTime,
    boxer: event.boxer,
    punchType: event.punchType,
    hand: event.hand,
    target: event.target,
    visibilityFlags: event.visibilityFlags,
    knockdown: event.knockdown,
    punchQuality: event.punchQuality,
    cam: event.cam ?? null,
    stance: event.stance ?? null,
    landed: event.landed ?? null,
    punchResult: event.punchResult ?? null,
    defenseType: event.defenseType ?? null,
    flagged: event.flagged ?? false,
    labeledBy: event.labeledBy ?? null,
    labeledByEmail: event.labeledByEmail ?? null,
    fightTitle: event.fightTitle || fallbackFightTitle,
    createdAt: createdAtByStart.get(event.startTime) ?? now,
  }));
}
