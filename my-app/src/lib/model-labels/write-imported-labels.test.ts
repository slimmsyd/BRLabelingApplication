import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ImportFightPlan } from './parse-model-labels';
import { writeImportedLabels } from './write-imported-labels';

interface StoredAssignment {
  id: string;
  videoId: string;
  labelType: string;
  username: string;
  events: { punchType: string }[];
}

function clone(rows: StoredAssignment[]): StoredAssignment[] {
  return rows.map((row) => ({ ...row, events: row.events.map((event) => ({ ...event })) }));
}

describe('import rollback', () => {
  it('restores the previous labels when inserting the new rows throws', async () => {
    const store: StoredAssignment[] = [
      {
        id: 'ali',
        videoId: 'vid',
        labelType: 'OFFENSE',
        username: 'Ali',
        events: [{ punchType: 'Jab' }, { punchType: 'Cross' }],
      },
    ];
    const snapshot = clone(store);
    const fight = {
      video: { id: 'vid', title: 'Fight A - R1', round: 1 },
      labelTypes: ['OFFENSE'],
      labeledBy: ['Modelv18'],
      rows: [
        {
          labeledBy: 'Modelv18',
          labelType: 'OFFENSE',
          event: {
            startTime: '00:01.00',
            endTime: '00:01.20',
            boxer: 'A',
            punchType: 'Hook',
            hand: 'L',
            target: 'Head',
            visibilityFlags: [],
            knockdown: false,
            punchQuality: '',
            cam: null,
            stance: null,
            landed: true,
            punchResult: 'I',
            defenseType: null,
            createdAt: null,
          },
        },
      ],
      replaced: 2,
      replacedBy: [],
      conflict: null,
    } as unknown as ImportFightPlan;

    const draft = clone(store);
    const tx = {
      videoAssignment: {
        deleteMany: async () => {
          for (let index = draft.length - 1; index >= 0; index -= 1) {
            if (draft[index].videoId === 'vid' && draft[index].labelType === 'OFFENSE') draft.splice(index, 1);
          }
        },
        create: async () => ({ id: 'model-assignment' }),
      },
      event: {
        createMany: async () => {
          throw new Error('insert failed');
        },
      },
    };

    await assert.rejects(
      () => writeImportedLabels(tx, [fight], new Map([['Modelv18', { id: 'm', email: 'modelv18@models.boxraw.local', username: 'Modelv18' }]])),
      /insert failed/,
    );
    draft.splice(0, draft.length, ...snapshot);
    assert.equal(draft.length, 1);
    assert.equal(draft[0].username, 'Ali');
    assert.equal(draft[0].events.length, 2);
    assert.deepEqual(store, snapshot);
  });
});