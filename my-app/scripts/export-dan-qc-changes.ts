/**
 * Export Dan's QC Changes to CSV
 * 
 * This script exports all events labeled/modified by Dan during QC (Quality Control).
 * 
 * QC IDENTIFICATION:
 * - labeledByEmail = 'dan@boxraw.com' (Dan made the change)
 * - assignment.status = 'REVIEWED' (the assignment was QC'd)
 * - assignment.userEmail !== labeledByEmail (Dan reviewed someone else's work)
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
  isQC: boolean;
}

async function exportDanQCChanges() {
  console.log('=== EXPORTING DAN\'S QC CHANGES ===\n');
  
  // Get all events labeled by Dan with full context
  const danEvents = await prisma.event.findMany({
    where: { labeledByEmail: 'dan@boxraw.com' },
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
  
  console.log(`Found ${danEvents.length} events labeled by Dan\n`);
  
  // Build export rows
  const rows: ExportRow[] = danEvents.map(e => ({
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
    originalLabelerEmail: e.assignment.userEmail,
    isQC: e.assignment.userEmail !== e.labeledByEmail
  }));
  
  // Generate CSV
  const headers = Object.keys(rows[0]).join(',');
  const csvRows = rows.map(row => {
    return Object.values(row).map(val => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'boolean') return val ? 'true' : 'false';
      if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return String(val);
    }).join(',');
  });
  
  const csv = [headers, ...csvRows].join('\n');
  
  // Write to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `dan-qc-changes-${timestamp}.csv`;
  const filepath = path.join(process.cwd(), 'scripts', filename);
  
  fs.writeFileSync(filepath, csv);
  
  console.log(`✅ Exported ${rows.length} events to: ${filepath}\n`);
  
  // Summary by video
  console.log('=== SUMMARY BY VIDEO ===');
  const byVideo: Record<string, number> = {};
  rows.forEach(r => {
    byVideo[r.videoTitle] = (byVideo[r.videoTitle] || 0) + 1;
  });
  
  Object.entries(byVideo)
    .sort((a, b) => b[1] - a[1])
    .forEach(([title, count]) => {
      console.log(`  ${title}: ${count} events`);
    });
  
  console.log(`\n=== DATE RANGE ===`);
  const dates = rows.map(r => new Date(r.updatedAt));
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
  console.log(`  From: ${minDate.toISOString()}`);
  console.log(`  To:   ${maxDate.toISOString()}`);
  
  console.log(`\n=== QC VERIFICATION ===`);
  const qcCount = rows.filter(r => r.isQC).length;
  console.log(`  QC events (reviewed someone else's work): ${qcCount}`);
  console.log(`  All assignments have status: ${[...new Set(rows.map(r => r.assignmentStatus))].join(', ')}`);
  
  await prisma.$disconnect();
}

exportDanQCChanges().catch(console.error);
