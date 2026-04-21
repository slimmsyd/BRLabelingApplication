import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

const COLUMNS = [
  'id',
  'assignmentId',
  'videoId',
  'videoTitle',
  'round',
  'boxer1',
  'boxer2',
  'fightTitle',
  'externalFightTitle',
  'externalRoundId',
  'fps',
  'boxer',
  'punchType',
  'hand',
  'stance',
  'target',
  'punchResult',
  'defenseType',
  'punchQuality',
  'knockdown',
  'landed',
  'cam',
  'visibilityFlags',
  'startTime',
  'endTime',
  'labelType',
  'labeledByEmail',
  'labeledBy',
  'assignmentStatus',
  'createdAt',
  'updatedAt',
] as const;

type Column = typeof COLUMNS[number];
type Row = Record<Column, unknown>;

function parseTimeToSeconds(timeStr: string | null | undefined): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  if (parts.length < 2) return 0;
  const mins = parseInt(parts[0]) || 0;
  const rest = parts[1];
  if (!rest) return mins * 60;
  const secParts = rest.split('.');
  const secs = parseInt(secParts[0]) || 0;
  const ms = parseInt(secParts[1] || '0') || 0;
  return mins * 60 + secs + ms / 100;
}

function formatCSVValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return String(val);
}

function generateCSV(rows: Row[]): string {
  const header = COLUMNS.join(',');
  if (rows.length === 0) return header;
  const body = rows
    .map(row => COLUMNS.map(col => formatCSVValue(row[col])).join(','))
    .join('\n');
  return `${header}\n${body}`;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });
    if (!user || (user.accountType !== 'ADMIN' && user.accountType !== 'QUALITY_CONTROL')) {
      return NextResponse.json(
        { error: 'Forbidden - Admin or QC access required' },
        { status: 403 }
      );
    }

    const videoId = request.nextUrl.searchParams.get('videoId');
    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const events = await prisma.event.findMany({
      where: { assignment: { videoId } },
      include: { assignment: { include: { video: true } } },
    });

    const sorted = [...events].sort(
      (a, b) => parseTimeToSeconds(a.startTime) - parseTimeToSeconds(b.startTime)
    );

    const rows: Row[] = sorted.map(e => ({
      id: e.id,
      assignmentId: e.assignmentId,
      videoId: e.assignment.video.id,
      videoTitle: e.assignment.video.title,
      round: e.assignment.video.round,
      boxer1: e.assignment.video.boxer1,
      boxer2: e.assignment.video.boxer2,
      fightTitle: e.fightTitle,
      externalFightTitle: e.assignment.video.externalFightTitle,
      externalRoundId: e.assignment.video.externalRoundId,
      fps: e.assignment.video.fps,
      boxer: e.boxer,
      punchType: e.punchType,
      hand: e.hand,
      stance: e.stance,
      target: e.target,
      punchResult: e.punchResult,
      defenseType: e.defenseType,
      punchQuality: e.punchQuality,
      knockdown: e.knockdown,
      landed: e.landed,
      cam: e.cam,
      visibilityFlags: e.visibilityFlags.join(';'),
      startTime: e.startTime,
      endTime: e.endTime,
      labelType: e.assignment.labelType,
      labeledByEmail: e.labeledByEmail,
      labeledBy: e.labeledBy,
      assignmentStatus: e.assignment.status,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    }));

    const csv = generateCSV(rows);
    const filename = `round-${slugify(video.title)}-${video.id}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Round export error:', error);
    return NextResponse.json({ error: 'Failed to export round events' }, { status: 500 });
  }
}
