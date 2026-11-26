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
}

export interface ReplacedLabeler {
  username: string;
  email: string | null;
  labelType: string;
  count: number;
}

export interface ImportFightPlan {
  video: FightCandidate;
  labelTypes: ImportLabelType[];
  labeledBy: string[];
  rows: ImportedLabelRow[];
  replaced: number;
  replacedBy: ReplacedLabeler[];
}

export type PlanModelLabelImportResult =
  | { ok: true; fights: ImportFightPlan[]; totalIncoming: number; totalReplaced: number }
  | { ok: false; error: string; fights: []; unmatched: UnmatchedFight[] };

export interface UnmatchedFight {
  videoId: string;
  title: string;
  round: number | null;
  rows: number;
}

export function modelAccountEmail(labeledBy: string, labeledByEmail: string): string {
  const provided = labeledByEmail.trim();
  if (provided.includes('@')) return provided.toLowerCase();
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
  const minutes = match[1].padStart(2, '0');
  const seconds = match[2];
  let fraction = match[3] ?? '00';
  if (fraction.length === 1) fraction = `${fraction}0`;
  if (fraction.length > 2) fraction = fraction.slice(0, 2);
  return `${minutes}:${seconds}.${fraction}`;
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
    const labelType = (labelRaw || 'OFFENSE').toUpperCase();
    if (!LABEL_TYPES.includes(labelType as ImportLabelType)) {
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

function matchFight(
  row: ImportedLabelRow,
  fights: FightCandidate[],
): { fight: FightCandidate } | { error: string } {
  if (row.videoId) {
    const byId = fights.find((fight) => fight.id === row.videoId);
    if (byId) return { fight: byId };
  }
  const byTitle = fightsMatchingTitle(row, fights);
  if (byTitle.length === 1) return { fight: byTitle[0] };
  if (byTitle.length > 1) {
    return {
      error: `More than one fight matches "${row.fightTitle || row.videoTitle}" round ${row.round}. Nothing was imported.`,
    };
  }
  const title = row.fightTitle || row.videoTitle || row.externalFightTitle || '(no title)';
  const idBit = row.videoId ? `videoId ${row.videoId}` : 'no videoId';
  const roundBit = row.round == null ? 'no round' : `round ${row.round}`;
  return {
    error: `No fight matches ${idBit}, "${title}", ${roundBit}. Nothing was imported.`,
  };
}

export function planModelLabelImport(
  rows: ImportedLabelRow[],
  fights: FightCandidate[],
  existing: ExistingAssignmentSummary[] = [],
): PlanModelLabelImportResult {
  const buckets = new Map<string, { video: FightCandidate; rows: ImportedLabelRow[] }>();
  const unmatched = new Map<string, UnmatchedFight>();
  let matchError = '';

  for (const row of rows) {
    const matched = matchFight(row, fights);
    if ('error' in matched) {
      matchError = matchError || matched.error;
      const key = `${row.videoId}|${row.fightTitle}|${row.videoTitle}|${row.round ?? ''}`;
      const prior = unmatched.get(key);
      if (prior) prior.rows += 1;
      else {
        unmatched.set(key, {
          videoId: row.videoId,
          title: row.fightTitle || row.videoTitle,
          round: row.round,
          rows: 1,
        });
      }
      continue;
    }
    const bucket = buckets.get(matched.fight.id);
    if (bucket) bucket.rows.push(row);
    else buckets.set(matched.fight.id, { video: matched.fight, rows: [row] });
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
        labelTypes.includes(assignment.labelType as ImportLabelType) &&
        assignment.eventCount > 0,
    );
    const replacedBy = relevant.map((assignment) => ({
      username: assignment.username || 'Unknown',
      email: assignment.email,
      labelType: assignment.labelType,
      count: assignment.eventCount,
    }));
    plans.push({
      video: bucket.video,
      labelTypes,
      labeledBy,
      rows: bucket.rows,
      replaced: replacedBy.reduce((sum, item) => sum + item.count, 0),
      replacedBy,
    });
  }

  return {
    ok: true,
    fights: plans,
    totalIncoming: rows.length,
    totalReplaced: plans.reduce((sum, fight) => sum + fight.replaced, 0),
  };
}
