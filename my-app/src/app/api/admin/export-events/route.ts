import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

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
    return 'No events found in the specified date range';
  }

  const headers = Object.keys(rows[0]).join(',');
  const csvRows = rows.map(row => {
    return Object.values(row).map(formatCSVValue).join(',');
  });

  return [headers, ...csvRows].join('\n');
}

function convertToTimezone(date: Date, timezone: string): string {
  return date.toLocaleString('en-US', { timeZone: timezone });
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or QC
    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    });

    if (!user || (user.accountType !== 'ADMIN' && user.accountType !== 'QUALITY_CONTROL')) {
      return NextResponse.json({ error: 'Forbidden - Admin or QC access required' }, { status: 403 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const timezone = searchParams.get('timezone') || 'UTC';
    const exportType = searchParams.get('exportType') || 'all'; // 'all' | 'qc'
    const qcUserEmail = searchParams.get('qcUserEmail') || null; // specific QC user email, or null for all QC users

    if (!startDateStr || !endDateStr) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Build where clause based on export type
    const baseWhere = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    const whereClause = exportType === 'qc' && qcUserEmail
      ? { ...baseWhere, labeledByEmail: qcUserEmail }
      : baseWhere;

    // Query events
    const events = await prisma.event.findMany({
      where: whereClause,
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

    // For QC exports, filter to only events where the reviewer != original labeler
    const filteredEvents = exportType === 'qc'
      ? events.filter(e => e.assignment.userEmail !== e.labeledByEmail)
      : events;

    // Build export rows
    const rows: ExportRow[] = filteredEvents.map(e => ({
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
      createdAt: convertToTimezone(e.createdAt, timezone),
      updatedAt: convertToTimezone(e.updatedAt, timezone),
      videoTitle: e.assignment.video.title,
      assignmentStatus: e.assignment.status,
      assignmentLabelType: e.assignment.labelType,
      originalLabelerEmail: e.assignment.userEmail,
      isQC: e.assignment.userEmail !== e.labeledByEmail
    }));

    // Generate CSV
    const csv = generateCSV(rows);

    // Create filename based on export type
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    let filename: string;
    if (exportType === 'qc') {
      const userSlug = qcUserEmail
        ? qcUserEmail.split('@')[0].replace(/[^a-z0-9]/gi, '-')
        : 'all';
      filename = `qc-changes-${userSlug}-${startStr}-to-${endStr}.csv`;
    } else {
      filename = `events-export-${startStr}-to-${endStr}.csv`;
    }

    // Return CSV as downloadable file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export events error:', error);
    return NextResponse.json({ error: 'Failed to export events' }, { status: 500 });
  }
}
