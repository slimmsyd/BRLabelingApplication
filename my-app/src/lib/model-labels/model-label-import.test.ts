import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  modelAccountEmail,
  parseModelLabelCsv,
  planModelLabelImport,
  type FightCandidate,
} from './parse-model-labels';

const sampleCsv = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'sample-model-labels.csv'),
  'utf8',
);

const sampleFight: FightCandidate = {
  id: 'cmwcdn3nr0000ic08n1j91598',
  title: 'Luke McCormack v Kay Prospere - R1',
  round: 1,
  externalFightTitle: null,
};

describe('model label CSV mapping', () => {
  it('maps the sample file onto punch fields and the model labeler', () => {
    const parsed = parseModelLabelCsv(sampleCsv);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;

    assert.equal(parsed.rows.length, 96);
    const first = parsed.rows[0];
    assert.equal(first.videoId, sampleFight.id);
    assert.equal(first.fightTitle, sampleFight.title);
    assert.equal(first.round, 1);
    assert.equal(first.labelType, 'OFFENSE');
    assert.equal(first.labeledBy, 'Modelv18');
    assert.equal(first.labeledByEmail, '');
    assert.equal(first.event.boxer, 'Luke McCormack');
    assert.equal(first.event.punchType, 'Jab');
    assert.equal(first.event.hand, 'L');
    assert.equal(first.event.target, 'Head');
    assert.equal(first.event.punchResult, 'I');
    assert.equal(first.event.landed, true);
    assert.equal(first.event.cam, 'CAM 1');
    assert.equal(first.event.startTime, '00:09.52');
    assert.equal(first.event.endTime, '00:10.12');
    assert.equal(first.event.stance, null);
    assert.equal(first.event.defenseType, null);
    assert.equal(first.event.punchQuality, '');
    assert.equal(first.event.knockdown, false);
    assert.deepEqual(first.event.visibilityFlags, []);

    const missedRight = parsed.rows.find((row) => row.event.startTime === '00:24.76');
    assert.ok(missedRight);
    assert.equal(missedRight?.event.punchType, 'Hook');
    assert.equal(missedRight?.event.hand, 'R');
    assert.equal(missedRight?.event.punchResult, 'M');
    assert.equal(missedRight?.event.landed, false);
    assert.equal(missedRight?.event.target, 'Head');

    const body = parsed.rows.find((row) => row.event.startTime === '00:51.56');
    assert.equal(body?.event.target, 'Body');
    assert.equal(body?.event.hand, 'R');
    assert.equal(body?.event.punchResult, 'M');
    assert.equal(body?.event.boxer, 'Kay Prospere');
  });

  it('falls back to the landed column when punchResult is empty', () => {
    const csv = [
      'videoId,fightTitle,videoTitle,round,labeledBy,punchType,hand,target,punchResult,landed,startTime,endTime,boxer,labelType',
      'vid-1,Fight A - R1,Fight A - R1,1,Modelv18,Jab,Left,Head,,false,00:01.00,00:01.20,Boxer A,OFFENSE',
      'vid-1,Fight A - R1,Fight A - R1,1,Modelv18,Cross,Right,Body,,true,00:02.00,00:02.20,Boxer B,OFFENSE',
    ].join('\n');
    const parsed = parseModelLabelCsv(csv);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.rows[0].event.punchResult, 'M');
    assert.equal(parsed.rows[0].event.landed, false);
    assert.equal(parsed.rows[1].event.punchResult, 'I');
    assert.equal(parsed.rows[1].event.landed, true);
    assert.equal(parsed.rows[1].event.hand, 'R');
    assert.equal(parsed.rows[1].event.target, 'Body');
  });

  it('rejects the file when a row has no labeler, and imports nothing', () => {
    const csv = [
      'videoId,fightTitle,round,labeledBy,punchType,startTime,labelType',
      'vid-1,Fight A,1,,Jab,00:01.00,OFFENSE',
    ].join('\n');
    const parsed = parseModelLabelCsv(csv);
    assert.equal(parsed.ok, false);
    if (parsed.ok) return;
    assert.match(parsed.errors[0], /labeledBy/);
  });

  it('rejects a file with no labelType column', () => {
    const csv = [
      'videoId,fightTitle,round,labeledBy,punchType,startTime',
      'vid-1,Fight A,1,Modelv18,Jab,00:01.00',
    ].join('\n');
    const parsed = parseModelLabelCsv(csv);
    assert.equal(parsed.ok, false);
    if (parsed.ok) return;
    assert.match(parsed.errors[0], /labelType/);
  });

  it('rejects a clock whose seconds are 60 or more', () => {
    const csv = [
      'videoId,labeledBy,punchType,startTime,labelType',
      'vid-1,Modelv18,Jab,00:60.00,OFFENSE',
    ].join('\n');
    const parsed = parseModelLabelCsv(csv);
    assert.equal(parsed.ok, false);
  });
});

describe('matching a model CSV to an existing fight', () => {
  const other: FightCandidate = {
    id: 'other-video',
    title: 'Someone Else v Nobody - R2',
    round: 2,
    externalFightTitle: 'Someone_Else_vs_Nobody',
  };

  it('matches videoId before title', () => {
    const parsed = parseModelLabelCsv(sampleCsv);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const plan = planModelLabelImport(parsed.rows, [sampleFight, other], [
      {
        videoId: sampleFight.id,
        labelType: 'OFFENSE',
        username: 'Ali',
        email: 'ali@boxraw.com',
        eventCount: 40,
      },
      {
        videoId: sampleFight.id,
        labelType: 'PUNCH_TAG',
        username: 'Sam',
        email: 'sam@boxraw.com',
        eventCount: 8,
      },
    ]);
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    assert.equal(plan.fights.length, 1);
    assert.equal(plan.fights[0].video.id, sampleFight.id);
    assert.equal(plan.totalIncoming, 96);
    assert.equal(plan.totalReplaced, 40);
    assert.deepEqual(plan.fights[0].labeledBy, ['Modelv18']);
    assert.deepEqual(plan.fights[0].labelTypes, ['OFFENSE']);
    assert.equal(plan.fights[0].replacedBy[0].username, 'Ali');
    assert.equal(plan.fights[0].replacedBy[0].count, 40);
  });

  it('falls back to fight title and round when videoId is missing or unknown', () => {
    const csv = [
      'videoId,fightTitle,videoTitle,round,labeledBy,punchType,hand,target,punchResult,startTime,labelType',
      ',Luke McCormack v Kay Prospere - R1,Luke McCormack v Kay Prospere - R1,1,Modelv18,Jab,Left,Head,Landed,00:09.52,OFFENSE',
    ].join('\n');
    const parsed = parseModelLabelCsv(csv);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const plan = planModelLabelImport(parsed.rows, [sampleFight, other]);
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    assert.equal(plan.fights[0].video.id, sampleFight.id);

    const unknownId = parseModelLabelCsv(
      'videoId,fightTitle,videoTitle,round,labeledBy,punchType,startTime,labelType\nnot-a-real-id,Luke McCormack v Kay Prospere - R1,Luke McCormack v Kay Prospere - R1,1,Modelv18,Jab,00:01.00,OFFENSE\n',
    );
    assert.equal(unknownId.ok, true);
    if (!unknownId.ok) return;
    const fallback = planModelLabelImport(unknownId.rows, [sampleFight]);
    assert.equal(fallback.ok, true);
    if (!fallback.ok) return;
    assert.equal(fallback.fights[0].video.id, sampleFight.id);
  });

  it('imports nothing when no fight matches', () => {
    const parsed = parseModelLabelCsv(sampleCsv);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const plan = planModelLabelImport(parsed.rows, [other]);
    assert.equal(plan.ok, false);
    if (plan.ok) return;
    assert.equal(plan.fights.length, 0);
    assert.match(plan.error, /Nothing was imported/);
    assert.match(plan.error, /cmwcdn3nr0000ic08n1j91598/);
  });

  it('does not match the same title in a different round', () => {
    const parsed = parseModelLabelCsv(sampleCsv);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const wrongRound: FightCandidate = { ...sampleFight, id: 'round-2', round: 2 };
    const plan = planModelLabelImport(
      parsed.rows.map((row) => ({ ...row, videoId: '' })),
      [wrongRound],
    );
    assert.equal(plan.ok, false);
  });

  it('builds a stable model account email from labeledBy and ignores a real address', () => {
    assert.equal(modelAccountEmail('Modelv18'), 'modelv18@models.boxraw.local');
  });

  it('refuses a videoId that disagrees with the title or round, including a repeated id', () => {
    const round1: FightCandidate = {
      id: 'round-1-id',
      title: 'Real Fight - R1',
      round: 1,
      externalFightTitle: null,
    };
    const round2: FightCandidate = { ...round1, id: 'round-2-id', title: 'Real Fight - R2', round: 2 };
    const header = 'videoId,fightTitle,videoTitle,round,labeledBy,punchType,startTime,labelType';
    const disagree = parseModelLabelCsv(
      [
        header,
        'round-1-id,Other Fight - R2,Other Fight - R2,2,Modelv18,Jab,00:01.00,OFFENSE',
      ].join('\n'),
    );
    assert.equal(disagree.ok, true);
    if (!disagree.ok) return;
    const wrong = planModelLabelImport(disagree.rows, [round1, round2], [
      {
        videoId: 'round-1-id',
        labelType: 'OFFENSE',
        username: 'Ali',
        email: 'ali@boxraw.com',
        eventCount: 40,
        status: 'SUBMITTED',
      },
    ]);
    assert.equal(wrong.ok, false);
    if (wrong.ok) return;
    assert.equal(wrong.fights.length, 0);
    assert.match(wrong.error, /round-1-id/);
    assert.match(wrong.error, /Real Fight - R1/);
    assert.match(wrong.error, /round 2/);

    const repeated = parseModelLabelCsv(
      [
        header,
        'round-1-id,Real Fight - R1,Real Fight - R1,1,Modelv18,Jab,00:01.00,OFFENSE',
        'round-1-id,Real Fight - R2,Real Fight - R2,2,Modelv18,Cross,00:02.00,OFFENSE',
      ].join('\n'),
    );
    assert.equal(repeated.ok, true);
    if (!repeated.ok) return;
    const folded = planModelLabelImport(repeated.rows, [round1, round2]);
    assert.equal(folded.ok, false);
    if (folded.ok) return;
    assert.equal(folded.fights.length, 0);
  });

  it('rejects two labelers on the same label type and lists empty assignments', () => {
    const header = 'videoId,fightTitle,round,labeledBy,punchType,startTime,labelType';
    const parsed = parseModelLabelCsv(
      [
        header,
        'vid-1,Fight A - R1,1,Modelv18,Jab,00:01.00,OFFENSE',
        'vid-1,Fight A - R1,1,Modelv19,Cross,00:02.00,OFFENSE',
      ].join('\n'),
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const fight: FightCandidate = { id: 'vid-1', title: 'Fight A - R1', round: 1, externalFightTitle: null };
    const two = planModelLabelImport(parsed.rows, [fight]);
    assert.equal(two.ok, false);

    const one = parseModelLabelCsv(
      [header, 'vid-1,Fight A - R1,1,Modelv18,Jab,00:01.00,OFFENSE'].join('\n'),
    );
    assert.equal(one.ok, true);
    if (!one.ok) return;
    const plan = planModelLabelImport(one.rows, [fight], [
      {
        videoId: 'vid-1',
        labelType: 'OFFENSE',
        username: 'Ali',
        email: 'ali@boxraw.com',
        eventCount: 0,
        status: 'IN_PROGRESS',
      },
      {
        videoId: 'vid-1',
        labelType: 'OFFENSE',
        username: 'Sam',
        email: 'sam@boxraw.com',
        eventCount: 3,
        status: 'REVIEWED',
      },
    ]);
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    assert.equal(plan.totalReplaced, 3);
    assert.equal(plan.fights[0].replacedBy.length, 2);
    assert.equal(plan.fights[0].replacedBy[0].status, 'IN_PROGRESS');
    assert.equal(plan.fights[0].replacedBy[0].count, 0);
    assert.equal(plan.fights[0].replacedBy[1].status, 'REVIEWED');
  });
});
