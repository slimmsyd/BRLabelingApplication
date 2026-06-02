#!/usr/bin/env node
/**
 * Tests for the createdAt-preserving event rebuild logic.
 *
 * Run:  npx tsx scripts/test-preserve-event-createdat.ts
 *
 * These cover the productivity-report bug Dan reported: QC re-saves
 * were stamping every event with a fresh `createdAt`, so old rounds
 * leaked into the current week's report whenever Dan reviewed them.
 */

import { strict as assert } from 'node:assert';
import {
  computeEventRowsWithPreservedTimestamps,
  type IncomingEvent,
} from '../src/lib/event-helpers';

const ASSIGNMENT_ID = 'a1';
const ORIGINAL = new Date('2025-04-15T12:00:00Z');
const NOW = new Date('2025-05-22T15:00:00Z');

function payload(startTime: string, over: Partial<IncomingEvent> = {}): IncomingEvent {
  return {
    startTime,
    endTime: '1:30.00',
    boxer: 'b1',
    punchType: 'jab',
    hand: 'left',
    target: 'head',
    visibilityFlags: [],
    knockdown: false,
    punchQuality: 'good',
    cam: null,
    stance: null,
    landed: false,
    punchResult: null,
    defenseType: null,
    labeledBy: 'u1',
    labeledByEmail: 'u1@boxraw.com',
    fightTitle: 'Test Fight',
    ...over,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// T1 — Dan's exact scenario. QC re-saves WITHOUT changing anything.
//      createdAt must NOT move to "now".
// ───────────────────────────────────────────────────────────────────────────
{
  const existing = [{ startTime: '1:23.45', createdAt: ORIGINAL }];
  const incoming = [payload('1:23.45')];
  const rows = computeEventRowsWithPreservedTimestamps(
    existing, incoming, ASSIGNMENT_ID, NOW, 'fallback',
  );
  assert.equal(
    rows[0].createdAt.getTime(),
    ORIGINAL.getTime(),
    'Unchanged event must preserve its original createdAt',
  );
  console.log('✅ T1: unchanged event preserves createdAt');
}

// ───────────────────────────────────────────────────────────────────────────
// T2 — QC edits punchType A → B on an existing event. createdAt still pinned.
//      Productivity report must continue attributing the event to its
//      original labeling week.
// ───────────────────────────────────────────────────────────────────────────
{
  const existing = [{ startTime: '1:23.45', createdAt: ORIGINAL }];
  const incoming = [payload('1:23.45', { punchType: 'cross' })];
  const rows = computeEventRowsWithPreservedTimestamps(
    existing, incoming, ASSIGNMENT_ID, NOW, 'fallback',
  );
  assert.equal(
    rows[0].createdAt.getTime(),
    ORIGINAL.getTime(),
    'QC edits to non-identity fields must preserve createdAt',
  );
  assert.equal(rows[0].punchType, 'cross', 'Edit was applied');
  console.log('✅ T2: punchType edit preserves createdAt');
}

// ───────────────────────────────────────────────────────────────────────────
// T3 — Genuinely new event added during QC pass gets a fresh createdAt.
// ───────────────────────────────────────────────────────────────────────────
{
  const existing = [{ startTime: '1:23.45', createdAt: ORIGINAL }];
  const incoming = [payload('1:23.45'), payload('2:30.00')];
  const rows = computeEventRowsWithPreservedTimestamps(
    existing, incoming, ASSIGNMENT_ID, NOW, 'fallback',
  );
  assert.equal(rows[0].createdAt.getTime(), ORIGINAL.getTime(), 'Old event pinned');
  assert.equal(rows[1].createdAt.getTime(), NOW.getTime(), 'New event uses now()');
  console.log('✅ T3: new event gets fresh createdAt');
}

// ───────────────────────────────────────────────────────────────────────────
// T4 — QC deletes one event. Survivor keeps original createdAt.
// ───────────────────────────────────────────────────────────────────────────
{
  const e1 = new Date('2025-04-15T12:00:00Z');
  const e2 = new Date('2025-04-15T12:05:00Z');
  const existing = [
    { startTime: '1:23.45', createdAt: e1 },
    { startTime: '2:00.00', createdAt: e2 },
  ];
  const incoming = [payload('1:23.45')];
  const rows = computeEventRowsWithPreservedTimestamps(
    existing, incoming, ASSIGNMENT_ID, NOW, 'fallback',
  );
  assert.equal(rows.length, 1, 'Deleted event gone');
  assert.equal(rows[0].createdAt.getTime(), e1.getTime(), 'Survivor pinned');
  console.log('✅ T4: deletion preserves survivor createdAt');
}

// ───────────────────────────────────────────────────────────────────────────
// T5 — Accepted limitation. If startTime itself changes during QC, we
//      cannot identify the row as "the same event" and it gets a fresh
//      createdAt. Documented and tested so a future change doesn't
//      silently regress it.
// ───────────────────────────────────────────────────────────────────────────
{
  const existing = [{ startTime: '1:23.45', createdAt: ORIGINAL }];
  const incoming = [payload('1:23.50')];
  const rows = computeEventRowsWithPreservedTimestamps(
    existing, incoming, ASSIGNMENT_ID, NOW, 'fallback',
  );
  assert.equal(
    rows[0].createdAt.getTime(),
    NOW.getTime(),
    'startTime change → treated as new event (documented limitation)',
  );
  console.log('✅ T5: startTime change → fresh createdAt (accepted)');
}

// ───────────────────────────────────────────────────────────────────────────
// T6 — Defensive: duplicate startTime in DB shouldn't crash. Earliest wins.
// ───────────────────────────────────────────────────────────────────────────
{
  const earlier = new Date('2025-04-15T12:00:00Z');
  const later = new Date('2025-04-15T12:30:00Z');
  const existing = [
    { startTime: '1:23.45', createdAt: later },
    { startTime: '1:23.45', createdAt: earlier },
  ];
  const incoming = [payload('1:23.45'), payload('1:23.45')];
  const rows = computeEventRowsWithPreservedTimestamps(
    existing, incoming, ASSIGNMENT_ID, NOW, 'fallback',
  );
  assert.equal(rows[0].createdAt.getTime(), earlier.getTime());
  assert.equal(rows[1].createdAt.getTime(), earlier.getTime());
  console.log('✅ T6: duplicate startTime — earliest wins');
}

// ───────────────────────────────────────────────────────────────────────────
// T7 — First save (no prior events). Every row gets now(). Same as today.
// ───────────────────────────────────────────────────────────────────────────
{
  const rows = computeEventRowsWithPreservedTimestamps(
    [], [payload('1:23.45')], ASSIGNMENT_ID, NOW, 'fallback',
  );
  assert.equal(rows[0].createdAt.getTime(), NOW.getTime());
  console.log('✅ T7: first save uses now() for all rows');
}

console.log('\n🎉 All 7 tests passed.');
