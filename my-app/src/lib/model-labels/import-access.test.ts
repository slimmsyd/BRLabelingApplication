import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canImportModelLabels } from './import-access';

describe('model label import access', () => {
  it('allows an admin and a round owner, and refuses everyone else', () => {
    assert.equal(canImportModelLabels(null), false);
    assert.equal(canImportModelLabels({ accountType: 'LABELER', email: 'ali@boxraw.com' }), false);
    assert.equal(canImportModelLabels({ accountType: 'QUALITY_CONTROL', email: 'qc@boxraw.com' }), false);
    assert.equal(canImportModelLabels({ accountType: 'ADMIN', email: 'admin@boxraw.com' }), true);
    assert.equal(canImportModelLabels({ accountType: 'LABELER', email: 'syd@boxraw.com' }), true);
  });
});
