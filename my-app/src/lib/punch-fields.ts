/**
 * Shared punch hand / result / target codes.
 *
 * Punch tags and imported model labels store:
 *   hand L or R, result I (impact) or M (missed), target Head or Body.
 * The landed boolean stays aligned with the result (I true, M false).
 * Full offense labeling still stores Left/Right and Landed/Missed/… and
 * those values keep loading. The external API still receives left/right
 * and Landed/Missed.
 */

export type HandCode = 'L' | 'R';
export type ResultCode = 'I' | 'M';
export type TargetName = 'Head' | 'Body';

export function parseHand(value: string | null | undefined): HandCode | '' {
  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized === 'l' || normalized === 'left') return 'L';
  if (normalized === 'r' || normalized === 'right') return 'R';
  return '';
}

export function parseTarget(value: string | null | undefined): TargetName | '' {
  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized === 'head' || normalized === 'h') return 'Head';
  if (normalized === 'body' || normalized === 'b') return 'Body';
  return '';
}

export function parseLandedFlag(value: boolean | string | null | undefined): boolean | null {
  if (typeof value === 'boolean') return value;
  if (value == null) return null;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return null;
}

const IMPACT_TO_CODE: Record<string, ResultCode> = {
  i: 'I',
  impact: 'I',
  landed: 'I',
  m: 'M',
  miss: 'M',
  missed: 'M',
};

export type MappedPunchResult =
  | { ok: true; punchResult: string | null; landed: boolean | null }
  | { ok: false; error: string };

/**
 * Map a result string and the legacy landed flag.
 * Blank stays blank — it is not treated as impact.
 * Unseen, Defended, and Illegal pass through for full offense labels.
 */
export function mapPunchResult(
  punchResult: string | null | undefined,
  landed: boolean | string | null | undefined,
): MappedPunchResult {
  const raw = (punchResult ?? '').trim();
  const key = raw.toLowerCase();
  const landedFlag = parseLandedFlag(landed);

  if (!key) {
    if (landedFlag === true) return { ok: true, punchResult: 'I', landed: true };
    if (landedFlag === false) return { ok: true, punchResult: 'M', landed: false };
    return { ok: true, punchResult: null, landed: null };
  }

  const code = IMPACT_TO_CODE[key];
  if (code === 'I') return { ok: true, punchResult: 'I', landed: true };
  if (code === 'M') return { ok: true, punchResult: 'M', landed: false };
  if (key === 'unseen') return { ok: true, punchResult: 'Unseen', landed: landedFlag };
  if (key === 'defended') return { ok: true, punchResult: 'Defended', landed: false };
  if (key === 'illegal') return { ok: true, punchResult: 'Illegal', landed: false };
  return { ok: false, error: `Invalid punchResult: ${raw}` };
}

export type StoredPunchTagFields =
  | { ok: true; hand: string; target: string; punchResult: string | null; landed: boolean | null }
  | { ok: false; error: string };

/** Normalize one punch tag. Only I/M (or blank) are valid results. */
export function storedPunchTagFields(input: {
  hand?: string | null;
  target?: string | null;
  punchResult?: string | null;
  landed?: boolean | string | null;
}): StoredPunchTagFields {
  const handRaw = (input.hand ?? '').trim();
  let hand = '';
  if (handRaw) {
    hand = parseHand(handRaw);
    if (!hand) return { ok: false, error: `Invalid hand: ${handRaw}` };
  }

  const targetRaw = (input.target ?? '').trim();
  let target = '';
  if (targetRaw) {
    target = parseTarget(targetRaw);
    if (!target) return { ok: false, error: `Invalid target: ${targetRaw}` };
  }

  const mapped = mapPunchResult(input.punchResult, input.landed);
  if (!mapped.ok) return mapped;
  if (mapped.punchResult && mapped.punchResult !== 'I' && mapped.punchResult !== 'M') {
    return { ok: false, error: `Invalid punchResult for punch tag: ${mapped.punchResult}` };
  }
  return {
    ok: true,
    hand,
    target,
    punchResult: mapped.punchResult,
    landed: mapped.landed,
  };
}

export function formatPunchTagDetails(event: {
  punchType: string;
  hand?: string | null;
  punchResult?: string | null;
  target?: string | null;
}): string {
  const parts = [event.punchType];
  const hand = parseHand(event.hand);
  if (hand) parts.push(hand);
  if (event.punchResult) parts.push(event.punchResult);
  const target = parseTarget(event.target) || (event.target ?? '').trim();
  if (target) parts.push(target);
  return parts.join(' ');
}

export function handMark(hand: string | null | undefined): string {
  return parseHand(hand);
}

/** Hand text for the event list. Codes stay L/R; Left/Right keep lead/rear. */
export function handBadgeText(hand: string | null | undefined, stance?: string | null): string {
  const code = parseHand(hand);
  if (!code) return (hand ?? '').trim();
  if (hand === 'L' || hand === 'R') return code;
  const side = stance || 'Orthodox';
  if (side === 'Orthodox') return code === 'L' ? 'Lead (L)' : 'Rear (R)';
  return code === 'R' ? 'Lead (R)' : 'Rear (L)';
}

export function resultLabel(punchResult?: string | null, landed?: boolean | null): string {
  if (punchResult) return punchResult;
  if (landed === true) return 'Landed';
  if (landed === false) return 'Missed';
  return '';
}

export function isImpactResult(punchResult?: string | null, landed?: boolean | null): boolean {
  if (punchResult === 'I' || punchResult === 'Landed') return true;
  if (punchResult) return false;
  return landed === true;
}

/**
 * Persist an offense result without inventing Landed.
 * A blank result and a blank landed flag stay blank.
 * An explicit landed true/false is kept, and I/M/Landed/Missed still force the flag.
 */
export function offenseFieldsForSave(
  punchResult: string | null | undefined,
  landed: boolean | null | undefined,
): { punchResult: string | null; landed: boolean | null } {
  const result = punchResult?.trim() || null;
  if (result) return { punchResult: result, landed: landedMatchingResult(result, landed) };
  if (landed === true || landed === false) return { punchResult: null, landed };
  return { punchResult: null, landed: null };
}

/** Keep the boolean aligned when a result code is present. Otherwise leave it. */
export function landedMatchingResult(
  punchResult: string | null | undefined,
  landed: boolean | null | undefined,
): boolean | null {
  if (punchResult === 'I' || punchResult === 'Landed') return true;
  if (
    punchResult === 'M' ||
    punchResult === 'Missed' ||
    punchResult === 'Defended' ||
    punchResult === 'Illegal'
  ) {
    return false;
  }
  if (landed === true || landed === false) return landed;
  return null;
}

export function toExternalHand(hand: string | null | undefined): string | null {
  const code = parseHand(hand);
  if (code === 'L') return 'left';
  if (code === 'R') return 'right';
  const trimmed = (hand ?? '').trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

/**
 * External consumers still speak Landed/Missed.
 * Punch tags pass emptyMeansLanded false so an unset tag is not sent as Landed.
 */
export function toExternalPunchResult(
  punchResult: string | null | undefined,
  landed: boolean | null | undefined,
  emptyMeansLanded = false,
): string | null {
  if (punchResult === 'I' || punchResult === 'Landed') return 'Landed';
  if (punchResult === 'M' || punchResult === 'Missed') return 'Missed';
  if (punchResult) return punchResult;
  if (landed === true) return 'Landed';
  if (landed === false) return 'Missed';
  return emptyMeansLanded ? 'Landed' : null;
}

/** Clip filters ask for Left/Right. Match the L/R codes as well. */
export function handFilterValues(hand: string): string[] | null {
  const code = parseHand(hand);
  if (code === 'L') return ['Left', 'L', 'left'];
  if (code === 'R') return ['Right', 'R', 'right'];
  return null;
}

/** Write L/R when the event already uses codes; otherwise keep Left/Right. */
export function handChoice(side: 'Left' | 'Right', current: string): string {
  if (current === 'L' || current === 'R') return side === 'Left' ? 'L' : 'R';
  return side;
}
