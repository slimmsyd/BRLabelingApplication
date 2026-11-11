import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CSV_COLUMNS, ExportableVideo, csvEscape, defaultFileName, localDateStamp, toCsv, toRows, videoWhere } from './export-video-urls';

const BASE = 'https://example.supabase.co/storage/v1/object/public/fight-videos';

function video(overrides: Partial<ExportableVideo> = {}): ExportableVideo {
  return {
    id: 'vid1',
    title: 'Bivol v Canelo - R3',
    boxer1: 'Bivol',
    boxer2: 'Canelo',
    fightDate: new Date('2022-05-07T00:00:00Z'),
    round: 3,
    segment: 'Seg 1',
    sourceUrls: [`${BASE}/bivol/r3/cam1.mp4`, `${BASE}/bivol/r3/cam2.mp4`],
    externalFightTitle: 'Bivol_vs_Canelo',
    externalRoundId: 'RD3',
    externalCamera: null,
    ...overrides,
  };
}

describe('export-video-urls', () => {
  it('writes one row per camera link, numbered from 1', () => {
    const rows = toRows([video()]);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows.map((row) => row.camera), ['1', '2']);
    assert.equal(rows[1].url, `${BASE}/bivol/r3/cam2.mp4`);
    assert.equal(rows[0].fight_date, '2022-05-07');
    assert.equal(rows[0].external_fight_title, 'Bivol_vs_Canelo');
    assert.equal(rows[0].external_camera, '');
  });

  it('trims stray spaces from names and titles', () => {
    const [row] = toRows([video({ title: ' Joshua Buatsi  v Willy Hutchinson - R8 ', boxer1: 'Joshua Buatsi ', boxer2: ' Willy Hutchinson' })]);
    assert.equal(row.title, 'Joshua Buatsi  v Willy Hutchinson - R8');
    assert.equal(row.boxer1, 'Joshua Buatsi');
    assert.equal(row.boxer2, 'Willy Hutchinson');
  });

  it('names the file with the local date, not the UTC date', () => {
    assert.equal(localDateStamp(new Date(2026, 10, 1, 21, 4)), '2026-11-01');
  });

  it('filters to the queue only, matching the app In Queue rule', () => {
    assert.deepEqual(videoWhere(false), { archived: false });
    assert.deepEqual(videoWhere(true), { archived: false, assignments: { none: {} } });
  });

  it('names the queue file differently from the full file', () => {
    const now = new Date(2026, 10, 1, 21, 4);
    assert.equal(defaultFileName(false, now), 'video-urls-2026-11-01.csv');
    assert.equal(defaultFileName(true, now), 'video-urls-queue-2026-11-01.csv');
  });

  it('skips videos whose sourceUrls is not a list of strings', () => {
    const rows = toRows([video({ sourceUrls: null }), video({ id: 'vid2', sourceUrls: ['', 42, ` ${BASE}/x.mp4 `] })]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].video_id, 'vid2');
    assert.equal(rows[0].url, `${BASE}/x.mp4`);
  });

  it('quotes CSV values that contain commas, quotes or newlines', () => {
    assert.equal(csvEscape('plain'), 'plain');
    assert.equal(csvEscape('Bivol, Dmitry'), '"Bivol, Dmitry"');
    assert.equal(csvEscape('the "Bomb"'), '"the ""Bomb"""');
  });

  it('starts with the header the Python script expects', () => {
    const csv = toCsv(toRows([video({ title: 'A, B' })]));
    const [header, first] = csv.split('\n');
    assert.equal(header, CSV_COLUMNS.join(','));
    assert.match(first, /^vid1,"A, B",Bivol,Canelo,2022-05-07,3,Seg 1,1,https:/);
  });
});
