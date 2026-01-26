/**
 * Export Events Log Report (Jan 19-23, 2026)
 *
 * Generates 3 CSV files:
 * 1. events-created-jan-19-23 - All events CREATED in date range
 * 2. events-modified-jan-19-23 - All events MODIFIED in date range (QC changes)
 * 3. dan-changes-jan-19-23 - All Dan's changes with original labeler info
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Date range: Jan 19-23, 2026
const START_DATE = new Date('2026-01-19T00:00:00.000Z');
const END_DATE = new Date('2026-01-23T23:59:59.999Z');

interface ExportRow {
  id: string;
  assignmentId: string;
  startTime: string;
  endTime: string;
  boxer: string;
  punchType: string;
  hand: string;
  target: string;
  visibilityFlags: string;
  knockdown: boolean;
  punchQuality: string;
  cam: string | null;
  stance: string | null;
  landed: boolean | null;
  punchResult: string | null;
  defenseType: string | null;
  labeledBy: string | null;
  labeledByEmail: string | null;
  fightTitle: string | null;
  createdAt: string;
  updatedAt: string;
  videoTitle: string;
  assignmentStatus: string;
  assignmentLabelType: string;
  originalLabelerEmail: string | null;
  isQC: boolean;
}

function formatCSVValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return String(val);
}

function generateCSV(rows: ExportRow[]): string {
  if (rows.length === 0) {
    return 'No events found';
  }

  const headers = Object.keys(rows[0]).join(',');
  const csvRows = rows.map(row => {
    return Object.values(row).map(formatCSVValue).join(',');
  });

  return [headers, ...csvRows].join('\n');
}

function saveCSV(csv: string, filename: string): string {
  const filepath = path.join(process.cwd(), 'scripts', filename);
  fs.writeFileSync(filepath, csv);
  return filepath;
}

function eventToRow(e: any): ExportRow {
  return {
    id: e.id,
    assignmentId: e.assignmentId,
    startTime: e.startTime,
    endTime: e.endTime,
    boxer: e.boxer,
    punchType: e.punchType,
    hand: e.hand,
    target: e.target,
    visibilityFlags: e.visibilityFlags.join(';'),
    knockdown: e.knockdown,
    punchQuality: e.punchQuality,
    cam: e.cam,
    stance: e.stance,
    landed: e.landed,
    punchResult: e.punchResult,
    defenseType: e.defenseType,
    labeledBy: e.labeledBy,
    labeledByEmail: e.labeledByEmail,
    fightTitle: e.fightTitle,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    videoTitle: e.assignment.video.title,
    assignmentStatus: e.assignment.status,
    assignmentLabelType: e.assignment.labelType,
    originalLabelerEmail: e.assignment.userEmail,
    isQC: e.assignment.userEmail !== e.labeledByEmail
  };
}

function printSummary(rows: ExportRow[], label: string) {
  console.log(`\n--- ${label} Summary ---`);

  // By video
  console.log('\nBy Video:');
  const byVideo: Record<string, number> = {};
  rows.forEach(r => {
    byVideo[r.videoTitle] = (byVideo[r.videoTitle] || 0) + 1;
  });
  Object.entries(byVideo)
    .sort((a, b) => b[1] - a[1])
    .forEach(([title, count]) => {
      console.log(`  ${title}: ${count} events`);
    });

  // By labeler
  console.log('\nBy Labeler (who made the change):');
  const byLabeler: Record<string, number> = {};
  rows.forEach(r => {
    const email = r.labeledByEmail || 'Unknown';
    byLabeler[email] = (byLabeler[email] || 0) + 1;
  });
  Object.entries(byLabeler)
    .sort((a, b) => b[1] - a[1])
    .forEach(([email, count]) => {
      console.log(`  ${email}: ${count} events`);
    });

  // QC count
  const qcCount = rows.filter(r => r.isQC).length;
  console.log(`\nQC Changes (labeledBy != originalLabeler): ${qcCount}`);
}

async function main() {
  console.log('================================================');
  console.log('   EVENT LOG REPORT: Jan 19-23, 2026');
  console.log('================================================');
  console.log(`Date range: ${START_DATE.toISOString()} to ${END_DATE.toISOString()}\n`);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // ============================================
  // 1. Events CREATED in date range
  // ============================================
  console.log('\n=== 1. EVENTS CREATED (Jan 19-23) ===');

  const eventsCreated = await prisma.event.findMany({
    where: {
      createdAt: {
        gte: START_DATE,
        lte: END_DATE
      }
    },
    include: {
      assignment: {
        include: { video: true, user: true }
      }
    },
    orderBy: [
      { assignment: { video: { title: 'asc' } } },
      { startTime: 'asc' }
    ]
  });

  console.log(`Found ${eventsCreated.length} events created in date range`);

  const createdRows = eventsCreated.map(eventToRow);

  if (createdRows.length > 0) {
    const createdCSV = generateCSV(createdRows);
    const createdFilepath = saveCSV(createdCSV, `events-created-jan-19-23-${timestamp}.csv`);
    console.log(`Exported to: ${createdFilepath}`);
    printSummary(createdRows, 'Events Created');
  }

  // ============================================
  // 2. Events MODIFIED in date range (QC changes)
  // ============================================
  console.log('\n\n=== 2. EVENTS MODIFIED (Jan 19-23) - QC Changes ===');

  const eventsModified = await prisma.event.findMany({
    where: {
      updatedAt: {
        gte: START_DATE,
        lte: END_DATE
      },
      // Only events that were NOT created in this range (actual modifications)
      NOT: {
        createdAt: {
          gte: START_DATE,
          lte: END_DATE
        }
      }
    },
    include: {
      assignment: {
        include: { video: true, user: true }
      }
    },
    orderBy: [
      { assignment: { video: { title: 'asc' } } },
      { startTime: 'asc' }
    ]
  });

  console.log(`Found ${eventsModified.length} events modified (but created before) in date range`);

  const modifiedRows = eventsModified.map(eventToRow);

  if (modifiedRows.length > 0) {
    const modifiedCSV = generateCSV(modifiedRows);
    const modifiedFilepath = saveCSV(modifiedCSV, `events-modified-jan-19-23-${timestamp}.csv`);
    console.log(`Exported to: ${modifiedFilepath}`);
    printSummary(modifiedRows, 'Events Modified');
  } else {
    console.log('No events were modified in this date range');
  }

  // ============================================
  // 3. Dan's Changes (from both created & modified)
  // ============================================
  console.log('\n\n=== 3. DAN\'S CHANGES (Jan 19-23) ===');

  const allRows = [...createdRows, ...modifiedRows];
  const danRows = allRows.filter(r => r.labeledByEmail === 'dan@boxraw.com');

  console.log(`Found ${danRows.length} events where Dan made changes`);

  if (danRows.length > 0) {
    const danCSV = generateCSV(danRows);
    const danFilepath = saveCSV(danCSV, `dan-changes-jan-19-23-${timestamp}.csv`);
    console.log(`Exported to: ${danFilepath}`);

    // Dan-specific summary
    console.log('\n--- Dan\'s Changes Summary ---');
    console.log('\nBy Original Labeler (whose work Dan reviewed):');
    const byOriginal: Record<string, number> = {};
    danRows.forEach(r => {
      const email = r.originalLabelerEmail || 'Unknown';
      byOriginal[email] = (byOriginal[email] || 0) + 1;
    });
    Object.entries(byOriginal)
      .sort((a, b) => b[1] - a[1])
      .forEach(([email, count]) => {
        console.log(`  ${email}: ${count} events`);
      });

    const danQCCount = danRows.filter(r => r.isQC).length;
    console.log(`\nDan's QC changes (reviewing others): ${danQCCount}`);
    console.log(`Dan's own work: ${danRows.length - danQCCount}`);
  } else {
    console.log('Dan did not make any changes in this date range');
  }

  // ============================================
  // Final Summary
  // ============================================
  console.log('\n\n================================================');
  console.log('   FINAL SUMMARY');
  console.log('================================================');
  console.log(`Events created (Jan 19-23): ${createdRows.length}`);
  console.log(`Events modified (Jan 19-23): ${modifiedRows.length}`);
  console.log(`Dan's total changes: ${danRows.length}`);
  console.log(`  - QC (reviewing others): ${danRows.filter(r => r.isQC).length}`);
  console.log(`  - Own work: ${danRows.filter(r => !r.isQC).length}`);

  await prisma.$disconnect();
}

main().catch(console.error);
