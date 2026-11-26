import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatPunchTagDetails,
  handFilterValues,
  landedMatchingResult,
  offenseFieldsForSave,
  mapPunchResult,
  parseHand,
  parseTarget,
  storedPunchTagFields,
  toExternalHand,
  toExternalPunchResult,
} from './punch-fields';

describe('punch field codes', () => {
  it('maps hands to L or R and leaves blanks alone', () => {
    assert.equal(parseHand('Left'), 'L');
    assert.equal(parseHand('right'), 'R');
    assert.equal(parseHand('R'), 'R');
    assert.equal(parseHand(''), '');
    assert.equal(parseHand(null), '');
  });

  it('maps targets to Head or Body', () => {
    assert.equal(parseTarget('head'), 'Head');
    assert.equal(parseTarget('Body'), 'Body');
    assert.equal(parseTarget(''), '');
  });

  it('maps Landed and Missed onto I and M and keeps landed in step', () => {
    assert.deepEqual(mapPunchResult('Landed', true), { ok: true, punchResult: 'I', landed: true });
    assert.deepEqual(mapPunchResult('Missed', false), { ok: true, punchResult: 'M', landed: false });
    assert.deepEqual(mapPunchResult('', 'false'), { ok: true, punchResult: 'M', landed: false });
    assert.deepEqual(mapPunchResult('', ''), { ok: true, punchResult: null, landed: null });
    assert.deepEqual(mapPunchResult('I', null), { ok: true, punchResult: 'I', landed: true });
  });

  it('does not treat a blank punch tag as landed', () => {
    const stored = storedPunchTagFields({ hand: '', target: '', punchResult: '', landed: null });
    assert.equal(stored.ok, true);
    if (stored.ok) {
      assert.equal(stored.punchResult, null);
      assert.equal(stored.landed, null);
    }
  });

  it('stores punch-tag hand, result, and target together', () => {
    const stored = storedPunchTagFields({
      hand: 'Left',
      target: 'body',
      punchResult: 'Missed',
      landed: false,
    });
    assert.deepEqual(stored, { ok: true, hand: 'L', target: 'Body', punchResult: 'M', landed: false });
  });

  it('keeps the external payload on left/right and Landed/Missed', () => {
    assert.equal(toExternalHand('L'), 'left');
    assert.equal(toExternalHand('Right'), 'right');
    assert.equal(toExternalHand(''), null);
    assert.equal(toExternalPunchResult('I', true), 'Landed');
    assert.equal(toExternalPunchResult('M', false), 'Missed');
    assert.equal(toExternalPunchResult(null, null), null);
    assert.equal(toExternalPunchResult(null, null, true), 'Landed');
  });

  it('leaves a blank offense result blank', () => {
    assert.deepEqual(offenseFieldsForSave(null, null), { punchResult: null, landed: null });
    assert.deepEqual(offenseFieldsForSave('', undefined), { punchResult: null, landed: null });
    assert.deepEqual(offenseFieldsForSave('I', false), { punchResult: 'I', landed: true });
  });

  it('forces the landed flag to follow I and M', () => {
    assert.equal(landedMatchingResult('I', false), true);
    assert.equal(landedMatchingResult('M', true), false);
    assert.equal(landedMatchingResult('Landed', null), true);
  });

  it('describes a punch tag from the fields that were set', () => {
    assert.equal(
      formatPunchTagDetails({ punchType: 'Jab', hand: 'L', punchResult: 'I', target: 'Head' }),
      'Jab L I Head',
    );
    assert.equal(formatPunchTagDetails({ punchType: 'Punch' }), 'Punch');
  });

  it('matches both stored hand vocabularies in clip filters', () => {
    assert.deepEqual(handFilterValues('Left'), ['Left', 'L', 'left']);
    assert.deepEqual(handFilterValues('R'), ['Right', 'R', 'right']);
  });
});
