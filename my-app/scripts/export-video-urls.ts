#!/usr/bin/env node
/**
 * Export one CSV row per camera link for every non-archived video.
 *
 * The output holds public storage links and fight metadata only, no keys or
 * passwords. Anyone with a link can play that video.
 *
 *   npx tsx scripts/export-video-urls.ts
 *   npx tsx scripts/export-video-urls.ts --queue
 *   npx tsx scripts/export-video-urls.ts path/to/out.csv
 *
 * --queue exports only videos with no assignments, which is what the app's
 * "In Queue" rail shows. Same columns either way.
 * Default output: exports/video-urls[-queue]-YYYY-MM-DD.csv (gitignored).
 * Pair it with Python/scripts/fetch_video_urls.py.
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

export const CSV_COLUMNS = [
  'video_id',
  'title',
  'boxer1',
  'boxer2',
  'fight_date',
  'round',
  'segment',
  'camera',
  'url',
  'external_fight_title',
  'external_round_id',
  'external_camera',
] as const;

type CsvColumn = (typeof CSV_COLUMNS)[number];
export type VideoUrlRow = Record<CsvColumn, string>;

export interface ExportableVideo {
  id: string;
  title: string;
  boxer1: string;
  boxer2: string;
  fightDate: Date;
  round: number;
  segment: string;
  sourceUrls: unknown;
  externalFightTitle: string | null;
  externalRoundId: string | null;
  externalCamera: string | null;
}

export function sourceUrlList(sourceUrls: unknown): string[] {
  if (!Array.isArray(sourceUrls)) return [];
  return sourceUrls.filter((url): url is string => typeof url === 'string' && url.trim().length > 0);
}

export function toRows(videos: ExportableVideo[]): VideoUrlRow[] {
  return videos.flatMap((video) =>
    sourceUrlList(video.sourceUrls).map((url, index) => ({
      video_id: video.id,
      title: video.title.trim(),
      boxer1: video.boxer1.trim(),
      boxer2: video.boxer2.trim(),
      fight_date: video.fightDate.toISOString().slice(0, 10),
      round: String(video.round),
      segment: video.segment.trim(),
      camera: String(index + 1),
      url: url.trim(),
      external_fight_title: video.externalFightTitle?.trim() ?? '',
      external_round_id: video.externalRoundId?.trim() ?? '',
      external_camera: video.externalCamera?.trim() ?? '',
    })),
  );
}

export function csvEscape(value: string): string {
  if (!/[",\r\n]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

export function toCsv(rows: VideoUrlRow[]): string {
  const header = CSV_COLUMNS.join(',');
  const lines = rows.map((row) => CSV_COLUMNS.map((column) => csvEscape(row[column])).join(','));
  return [header, ...lines].join('\n') + '\n';
}

export function localDateStamp(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** "In Queue" in the app means a video with zero assignments (VideoGrid.tsx). */
export function videoWhere(queueOnly: boolean): { archived: boolean; assignments?: { none: object } } {
  return queueOnly ? { archived: false, assignments: { none: {} } } : { archived: false };
}

export function defaultFileName(queueOnly: boolean, now: Date): string {
  return `video-urls${queueOnly ? '-queue' : ''}-${localDateStamp(now)}.csv`;
}

function defaultOutputPath(queueOnly: boolean): string {
  return path.join(__dirname, '../exports', defaultFileName(queueOnly, new Date()));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const queueOnly = args.includes('--queue');
  const outputArg = args.find((arg) => !arg.startsWith('--'));
  const outputPath = path.resolve(outputArg ?? defaultOutputPath(queueOnly));
  const prisma = new PrismaClient();

  try {
    const videos = await prisma.video.findMany({
      where: videoWhere(queueOnly),
      orderBy: [{ fightDate: 'asc' }, { title: 'asc' }, { round: 'asc' }, { segment: 'asc' }],
      select: {
        id: true,
        title: true,
        boxer1: true,
        boxer2: true,
        fightDate: true,
        round: true,
        segment: true,
        sourceUrls: true,
        externalFightTitle: true,
        externalRoundId: true,
        externalCamera: true,
      },
    });

    const rows = toRows(videos);
    const withoutLinks = videos.filter((video) => sourceUrlList(video.sourceUrls).length === 0);

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, toCsv(rows), 'utf8');

    console.log(`Exported ${rows.length} links from ${videos.length} videos${queueOnly ? ' still in the queue (never assigned)' : ' (archived videos left out)'}.`);
    if (withoutLinks.length > 0) {
      console.log(`${withoutLinks.length} videos have no links and were skipped: ${withoutLinks.map((v) => v.id).join(', ')}`);
    }
    console.log(`Wrote ${outputPath}`);
    console.log('Send this file with Python/scripts/fetch_video_urls.py. Anyone with the file can play these videos.');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Export failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
