/**
 * Parse a model-label CSV and match it to fights already in the app.
 * No database access — the import route loads fights and writes rows.
 */

import { mapPunchResult, parseHand, parseTarget } from '../punch-fields';

export const LABEL_TYPES = ['OFFENSE', 'DEFENSE', 'FOOTWORK', 'PUNCH_TAG'] as const;
export type ImportLabelType = (typeof LABEL_TYPES)[number];

export interface ImportedEventFields {
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
  createdAt: string | null;
}

export interface ImportedLabelRow {
  sourceRow: number;
  videoId: string;
  videoTitle: string;
  fightTitle: string;
  externalFightTitle: string;
  round: number | null;
  labelType: ImportLabelType;
  labeledBy: string;
  labeledByEmail: string;
  event: ImportedEventFields;
}

export type ParseModelLabelCsvResult =
  | { ok: true; rows: ImportedLabelRow[] }
  | { ok: false; errors: string[] };

export interface FightCandidate {
  id: string;
  title: string;
  round: number;
  externalFightTitle?: string | null;
}

export interface ExistingAssignmentSummary {
  videoId: string;
  labelType: string;
  username: string | null;
  email: string | null;
  eventCount: number;
  status?: string | null;
}

export interface ReplacedLabeler {
  username: string;
  email: string | null;
  labelType: string;
  count: number;
  status: string | null;
}

export interface ImportConflictView {
  csvTitle: string;
  csvRound: number | null;
  videoId: string;
  videoIdFightTitle: string;
  videoIdFightRound: number;
  writeTitle: string;
  writeRound: number;
  writeVideoId: string;
}

export interface ImportFightPlan {
  video: FightCandidate;
  labelTypes: ImportLabelType[];
  labeledBy: string[];
  rows: ImportedLabelRow[];
  replaced: number;
  replacedBy: ReplacedLabeler[];
  /** Set when videoId names a different fight than the row title and round. */
  conflict: ImportConflictView | null;
}

/** Events plus one for each assignment that would be removed with no events yet. */
export function replacementWeight(items: { count: number }[]): number {
  return items.reduce((sum, item) => sum + item.count + (item.count === 0 ? 1 : 0), 0);
}

export type PlanModelLabelImportResult =
  | { ok: true; fights: ImportFightPlan[]; totalIncoming: number; totalReplaced: number; needsOverride: boolean }
  | { ok: false; error: string; fights: []; unmatched: UnmatchedFight[] };

export interface UnmatchedFight {
  videoId: string;
  title: string;
  round: number | null;
  rows: number;
}

/** Always a synthetic address. A CSV email is not used, so it cannot block a person from signing up. */
export function modelAccountEmail(labeledBy: string): string {
  const slug = labeledBy
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'model'}@models.boxraw.local`;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const source = text.replace(/^\uFEFF/, '');

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ',') {
      row.push(cell);
      cell = '';
      continue;
    }
    if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      row.push(cell);
      cell = '';
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      continue;
    }
    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value.trim() !== '')) rows.push(row);
  }
  return rows;
}

export function normalizeClock(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (minutes > 99 || seconds > 59) return null;
  let fraction = match[3] ?? '00';
  if (fraction.length === 1) fraction = `${fraction}0`;
  if (fraction.length > 2) fraction = fraction.slice(0, 2);
  return `${match[1].padStart(2, '0')}:${match[2]}.${fraction}`;
}

function cell(record: Record<string, string>, key: string): string {
  return (record[key] ?? '').trim();
}

function parseRound(value: string): number | null {
  if (!value) return null;
  const round = Number(value);
  if (!Number.isInteger(round)) return null;
  return round;
}

function parseFlags(value: string): string[] {
  if (!value.trim()) return [];
  return value
    .split(/[;|]/)
    .map((flag) => flag.trim())
    .filter(Boolean);
}

function parseKnockdown(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function emptyToNull(value: string): string | null {
  return value.trim() ? value.trim() : null;
}

export function parseModelLabelCsv(text: string): ParseModelLabelCsvResult {
  const table = parseCsv(text);
  if (table.length === 0) {
    return { ok: false, errors: ['The CSV is empty. Nothing was imported.'] };
  }

  const headers = table[0].map((header) => header.trim());
  if (!headers.includes('labelType')) {
    return {
      ok: false,
      errors: ['The CSV has no labelType column, so it cannot choose which labels to replace. Nothing was imported.'],
    };
  }
  const errors: string[] = [];
  const rows: ImportedLabelRow[] = [];

  for (let index = 1; index < table.length; index += 1) {
    const sourceRow = index + 1;
    const values = table[index];
    const record: Record<string, string> = {};
    headers.forEach((header, column) => {
      if (!header) return;
      record[header] = values[column] ?? '';
    });

    const labeledBy = cell(record, 'labeledBy');
    const punchType = cell(record, 'punchType');
    const startRaw = cell(record, 'startTime');
    const endRaw = cell(record, 'endTime');
    const rowErrors: string[] = [];

    if (!labeledBy) rowErrors.push('labeledBy is empty');
    if (!punchType) rowErrors.push('punchType is empty');

    const startTime = normalizeClock(startRaw);
    if (!startTime) rowErrors.push(`startTime "${startRaw || ''}" is not mm:ss.xx`);
    const endTime = endRaw ? normalizeClock(endRaw) : startTime;
    if (endRaw && !endTime) rowErrors.push(`endTime "${endRaw}" is not mm:ss.xx`);

    const handRaw = cell(record, 'hand');
    const hand = handRaw ? parseHand(handRaw) : '';
    if (handRaw && !hand) rowErrors.push(`hand "${handRaw}" is not Left/Right or L/R`);

    const targetRaw = cell(record, 'target');
    const target = targetRaw ? parseTarget(targetRaw) : '';
    if (targetRaw && !target) rowErrors.push(`target "${targetRaw}" is not Head or Body`);

    const mapped = mapPunchResult(cell(record, 'punchResult'), cell(record, 'landed'));
    if (!mapped.ok) rowErrors.push(mapped.error);

    const labelRaw = cell(record, 'labelType');
    const labelType = labelRaw.toUpperCase();
    if (!labelRaw) rowErrors.push('labelType is empty');
    else if (!LABEL_TYPES.includes(labelType as ImportLabelType)) {
      rowErrors.push(`labelType "${labelRaw}" is not a known label type`);
    }

    const roundRaw = cell(record, 'round');
    const round = parseRound(roundRaw);
    if (roundRaw && round == null) rowErrors.push(`round "${roundRaw}" is not a whole number`);

    const createdRaw = cell(record, 'createdAt');
    let createdAt: string | null = null;
    if (createdRaw) {
      const created = new Date(createdRaw);
      if (Number.isNaN(created.getTime())) rowErrors.push(`createdAt "${createdRaw}" is not a time`);
      else createdAt = created.toISOString();
    }

    if (rowErrors.length > 0 || !mapped.ok || !startTime || !endTime) {
      errors.push(`Row ${sourceRow}: ${rowErrors.join('; ') || 'could not be read'}`);
      continue;
    }

    rows.push({
      sourceRow,
      videoId: cell(record, 'videoId'),
      videoTitle: cell(record, 'videoTitle'),
      fightTitle: cell(record, 'fightTitle'),
      externalFightTitle: cell(record, 'externalFightTitle'),
      round,
      labelType: labelType as ImportLabelType,
      labeledBy,
      labeledByEmail: cell(record, 'labeledByEmail'),
      event: {
        startTime,
        endTime,
        boxer: cell(record, 'boxer'),
        punchType,
        hand,
        target,
        visibilityFlags: parseFlags(cell(record, 'visibilityFlags')),
        knockdown: parseKnockdown(cell(record, 'knockdown')),
        punchQuality: cell(record, 'punchQuality'),
        cam: emptyToNull(cell(record, 'cam')),
        stance: emptyToNull(cell(record, 'stance')),
        landed: mapped.landed,
        punchResult: mapped.punchResult,
        defenseType: emptyToNull(cell(record, 'defenseType')),
        createdAt,
      },
    });
  }

  if (rows.length === 0 && errors.length === 0) {
    return { ok: false, errors: ['The CSV has no label rows. Nothing was imported.'] };
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, rows };
}

function normTitle(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function titleKeys(row: ImportedLabelRow): Set<string> {
  return new Set(
    [row.fightTitle, row.videoTitle, row.externalFightTitle].map(normTitle).filter(Boolean),
  );
}

function fightsMatchingTitle(row: ImportedLabelRow, fights: FightCandidate[]): FightCandidate[] {
  if (row.round == null) return [];
  const wanted = titleKeys(row);
  if (wanted.size === 0) return [];
  return fights.filter((fight) => {
    if (fight.round !== row.round) return false;
    const names = [fight.title, fight.externalFightTitle || ''].map(normTitle).filter(Boolean);
    return names.some((name) => wanted.has(name));
  });
}

function titleAgrees(value: string, fight: FightCandidate): boolean {
  const key = normTitle(value);
  if (!key) return true;
  const names = [fight.title, fight.externalFightTitle || ''].map(normTitle).filter(Boolean);
  return names.includes(key);
}

/** An existing videoId must agree with every title and the round the row actually filled in. */
function disagreement(row: ImportedLabelRow, fight: FightCandidate): string | null {
  const problems: string[] = [];
  if (row.round != null && row.round !== fight.round) {
    problems.push(`CSV round ${row.round}, video round ${fight.round}`);
  }
  for (const [label, value] of [
    ['fightTitle', row.fightTitle],
    ['videoTitle', row.videoTitle],
    ['externalFightTitle', row.externalFightTitle],
  ] as const) {
    if (value && !titleAgrees(value, fight)) {
      problems.push(`CSV ${label} "${value}" does not match "${fight.title}"`);
    }
  }
  if (problems.length === 0) return null;
  return `videoId ${row.videoId} is "${fight.title}" round ${fight.round}, but the row disagrees (${problems.join('; ')}). Nothing was imported.`;
}

function groupKey(row: ImportedLabelRow): string {
  const title = normTitle(row.fightTitle || row.videoTitle || row.externalFightTitle);
  return `${title}|${row.round ?? ''}`;
}

function uniqueFights(fights: FightCandidate[]): FightCandidate[] {
  const seen = new Set<string>();
  return fights.filter((fight) => {
    if (seen.has(fight.id)) return false;
    seen.add(fight.id);
    return true;
  });
}

/**
 * Rows are already one title + round. videoId is checked against that title and round.
 * A repeated id across rounds does not pull every row onto the id's fight.
 */
function resolveGroup(
  rows: ImportedLabelRow[],
  fights: FightCandidate[],
): { fight: FightCandidate; conflict: ImportConflictView | null } | { error: string } {
  const sample = rows[0];
  const byTitle = fightsMatchingTitle(sample, fights);
  if (byTitle.length > 1) {
    return {
      error: `More than one fight matches "${sample.fightTitle || sample.videoTitle}" round ${sample.round}. Nothing was imported.`,
    };
  }
  const titleMatch = byTitle[0] ?? null;
  const idFights = uniqueFights(
    rows
      .map((row) => fights.find((fight) => row.videoId && fight.id === row.videoId))
      .filter((fight): fight is FightCandidate => Boolean(fight)),
  );
  const disagreeing = idFights.filter((fight) => disagreement(sample, fight));
  const csvTitle = sample.fightTitle || sample.videoTitle || sample.externalFightTitle || '(no title)';

  if (titleMatch && disagreeing.length === 0) {
    const agreed = idFights.find((fight) => !disagreement(sample, fight));
    return { fight: agreed && agreed.id === titleMatch.id ? agreed : titleMatch, conflict: null };
  }

  if (titleMatch && disagreeing.length > 0) {
    const other = disagreeing[0];
    return {
      fight: titleMatch,
      conflict: {
        csvTitle,
        csvRound: sample.round,
        videoId: sample.videoId || other.id,
        videoIdFightTitle: other.title,
        videoIdFightRound: other.round,
        writeTitle: titleMatch.title,
        writeRound: titleMatch.round,
        writeVideoId: titleMatch.id,
      },
    };
  }

  if (!titleMatch && disagreeing.length > 0) {
    const other = disagreeing[0];
    return {
      error: `videoId ${sample.videoId || other.id} is "${other.title}" round ${other.round}, but the CSV says "${csvTitle}" round ${sample.round ?? '?'}, and that fight is not in the app. Nothing was imported.`,
    };
  }

  if (!titleMatch && idFights.length === 1 && disagreeing.length === 0) {
    return { fight: idFights[0], conflict: null };
  }

  const idBit = sample.videoId ? `videoId ${sample.videoId}` : 'no videoId';
  const roundBit = sample.round == null ? 'no round' : `round ${sample.round}`;
  return {
    error: `No fight matches ${idBit}, "${csvTitle}", ${roundBit}. Nothing was imported.`,
  };
}

export function planModelLabelImport(
  rows: ImportedLabelRow[],
  fights: FightCandidate[],
  existing: ExistingAssignmentSummary[] = [],
): PlanModelLabelImportResult {
  const groups = new Map<string, ImportedLabelRow[]>();
  for (const row of rows) {
    const key = groupKey(row);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const buckets = new Map<string, { video: FightCandidate; rows: ImportedLabelRow[]; conflict: ImportConflictView | null }>();
  const unmatched = new Map<string, UnmatchedFight>();
  let matchError = '';

  for (const groupRows of groups.values()) {
    const resolved = resolveGroup(groupRows, fights);
    if ('error' in resolved) {
      matchError = matchError || resolved.error;
      const sample = groupRows[0];
      const key = `${sample.videoId}|${sample.fightTitle}|${sample.videoTitle}|${sample.round ?? ''}`;
      unmatched.set(key, {
        videoId: sample.videoId,
        title: sample.fightTitle || sample.videoTitle,
        round: sample.round,
        rows: groupRows.length,
      });
      continue;
    }
    const bucket = buckets.get(resolved.fight.id);
    if (bucket) {
      bucket.rows.push(...groupRows);
      bucket.conflict = bucket.conflict ?? resolved.conflict;
    } else {
      buckets.set(resolved.fight.id, {
        video: resolved.fight,
        rows: [...groupRows],
        conflict: resolved.conflict,
      });
    }
  }

  if (unmatched.size > 0) {
    return {
      ok: false,
      error: matchError || 'No fight matched the CSV. Nothing was imported.',
      fights: [],
      unmatched: [...unmatched.values()],
    };
  }

  const plans: ImportFightPlan[] = [];
  for (const bucket of buckets.values()) {
    const labelTypes = [...new Set(bucket.rows.map((row) => row.labelType))];
    const labeledBy = [...new Set(bucket.rows.map((row) => row.labeledBy))];
    const relevant = existing.filter(
      (assignment) =>
        assignment.videoId === bucket.video.id &&
        labelTypes.includes(assignment.labelType as ImportLabelType),
    );
    const replacedBy = relevant.map((assignment) => ({
      username: assignment.username || 'Unknown',
      email: assignment.email,
      labelType: assignment.labelType,
      count: assignment.eventCount,
      status: assignment.status ?? null,
    }));
    plans.push({
      video: bucket.video,
      labelTypes,
      labeledBy,
      rows: bucket.rows,
      replaced: replacementWeight(replacedBy),
      replacedBy,
      conflict: bucket.conflict,
    });
  }

  return {
    ok: true,
    fights: plans,
    totalIncoming: rows.length,
    totalReplaced: plans.reduce((sum, fight) => sum + fight.replaced, 0),
    needsOverride: plans.some((fight) => fight.conflict != null),
  };
}
