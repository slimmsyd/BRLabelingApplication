import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/videos/submitted
 * Fetches all submitted videos (SUBMITTED, REVIEWED, COMPLETED status)
 * Public - everyone can see submitted videos
 */
export async function GET() {
  try {
    const submittedAssignments = await prisma.videoAssignment.findMany({
      where: {
        status: {
          in: ['SUBMITTED', 'REVIEWED', 'COMPLETED']
        },
        labelType: 'OFFENSE', // Only show offense assignments for now
      },
      orderBy: {
        updatedAt: 'desc', // Most recently updated first
      },
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
    });

    return NextResponse.json({ assignments: submittedAssignments }, { status: 200 });
  } catch (error) {
    console.error('[Submitted Videos API] Error fetching submitted videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submitted videos' },
      { status: 500 }
    );
  }
}

