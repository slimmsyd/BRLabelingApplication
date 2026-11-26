import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assignmentLookup } from './assignment-lookup';

describe('workspace assignment lookup', () => {
  it('opens the requested assignment instead of an unordered first row', () => {
    const lookup = assignmentLookup({
      videoId: 'vid',
      labelType: 'OFFENSE',
      assignmentId: 'assign-model-b',
    });
    assert.equal(lookup.where.id, 'assign-model-b');
    assert.equal(lookup.where.videoId, 'vid');
    assert.deepEqual(lookup.orderBy, { assignedAt: 'desc' });
  });
});
