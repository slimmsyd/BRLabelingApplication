/**
 * Export Events by Date Range to CSV
 * 
 * This script exports all events within specified date ranges.
 * 
 * OUTPUT FORMAT: Matches the Event schema from prisma/schema.prisma
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ExportRow {
  // Event fields (matching schema)
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
  
  // Context fields for clarity
  videoTitle: string;
  assignmentStatus: string;
  assignmentLabelType: string;
  originalLabelerEmail: string | null;
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

async function exportEventsByDateRange(
  startDate: Date,
  endDate: Date,
  label: string
): Promise<{ count: number; filepath: string }> {
  console.log(`\n=== EXPORTING EVENTS: ${label} ===`);
  console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}\n`);
  
  // Get all events within date range
  const events = await prisma.event.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      assignment: {
        include: { 
          video: true,
          user: true
        }
      }
    },
    orderBy: [
      { assignment: { video: { title: 'asc' } } },
      { startTime: 'asc' }
    ]
  });
  
  console.log(`Found ${events.length} events\n`);
  
  if (events.length === 0) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `events-${label}-${timestamp}.csv`;
    const filepath = saveCSV('No events found in date range', filename);
    return { count: 0, filepath };
  }
  
  // Build export rows
  const rows: ExportRow[] = events.map(e => ({
    // Event fields (matching schema exactly)
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
    
    // Context fields
    videoTitle: e.assignment.video.title,
    assignmentStatus: e.assignment.status,
    assignmentLabelType: e.assignment.labelType,
    originalLabelerEmail: e.assignment.userEmail
  }));
  
  // Generate CSV
  const csv = generateCSV(rows);
  
  // Write to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `events-${label}-${timestamp}.csv`;
  const filepath = saveCSV(csv, filename);
  
  console.log(`✅ Exported ${rows.length} events to: ${filepath}\n`);
  
  // Summary by video
  console.log('--- Summary by Video ---');
  const byVideo: Record<string, number> = {};
  rows.forEach(r => {
    byVideo[r.videoTitle] = (byVideo[r.videoTitle] || 0) + 1;
  });
  
  Object.entries(byVideo)
    .sort((a, b) => b[1] - a[1])
    .forEach(([title, count]) => {
      console.log(`  ${title}: ${count} events`);
    });
  
  // Summary by labeler
  console.log('\n--- Summary by Labeler ---');
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
  
  return { count: rows.length, filepath };
}

async function main() {
  console.log('========================================');
  console.log('   EVENT EXPORT BY DATE RANGE');
  console.log('========================================');
  
  // Export 1: This week (Jan 12-17, 2026)
  const thisWeekStart = new Date('2026-01-12T00:00:00.000Z');
  const thisWeekEnd = new Date('2026-01-17T23:59:59.999Z');
  const thisWeekResult = await exportEventsByDateRange(
    thisWeekStart,
    thisWeekEnd,
    'this-week-jan-12-17'
  );
  
  // Export 2: Jan 12-16 specifically
  const jan12_16Start = new Date('2026-01-12T00:00:00.000Z');
  const jan12_16End = new Date('2026-01-16T23:59:59.999Z');
  const jan12_16Result = await exportEventsByDateRange(
    jan12_16Start,
    jan12_16End,
    'jan-12-16'
  );
  
  console.log('\n========================================');
  console.log('   EXPORT COMPLETE');
  console.log('========================================');
  console.log(`\nThis week (Jan 12-17): ${thisWeekResult.count} events`);
  console.log(`  File: ${thisWeekResult.filepath}`);
  console.log(`\nJan 12-16: ${jan12_16Result.count} events`);
  console.log(`  File: ${jan12_16Result.filepath}`);
  
  await prisma.$disconnect();
}

main().catch(console.error);
