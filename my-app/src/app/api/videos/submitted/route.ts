import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// Safety ceiling so this query can never grow unbounded. Set well above current
// volume (~680) so no live data is dropped; relies on the status counts below to
// keep the sidebar badges truthful if the cap is ever reached.
const SUBMITTED_CAP = 5000;

/**
 * GET /api/videos/submitted
 * Fetches submitted videos (SUBMITTED, REVIEWED, COMPLETED status)
 * Public - everyone can see submitted videos
 */
export async function GET() {
  try {
    const whereClause: Prisma.VideoAssignmentWhereInput = {
      status: { in: ['SUBMITTED', 'REVIEWED', 'COMPLETED'] },
      labelType: 'OFFENSE', // Only show offense assignments for now
    };

    const [submittedAssignments, grouped] = await Promise.all([
      prisma.videoAssignment.findMany({
        where: whereClause,
        orderBy: { updatedAt: 'desc' }, // Most recently updated first
        take: SUBMITTED_CAP,
        select: {
          id: true,
          status: true,
          updatedAt: true,
          username: true,
          video: {
            select: {
              id: true,
              title: true,
              boxer1: true,
              boxer2: true,
              round: true,
            },
          },
        },
      }),
      // Authoritative per-status counts so badges stay correct even if capped.
      prisma.videoAssignment.groupBy({
        by: ['status'],
        where: whereClause,
        _count: { _all: true },
      }),
    ]);

    const countFor = (statuses: string[]) =>
      grouped
        .filter((g) => statuses.includes(g.status))
        .reduce((sum, g) => sum + (g._count?._all ?? 0), 0);

    const counts = {
      awaiting: countFor(['SUBMITTED']),
      complete: countFor(['REVIEWED', 'COMPLETED']),
    };

    return NextResponse.json({ assignments: submittedAssignments, counts }, { status: 200 });
  } catch (error) {
    console.error('[Submitted Videos API] Error fetching submitted videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submitted videos' },
      { status: 500 }
    );
  }
}

