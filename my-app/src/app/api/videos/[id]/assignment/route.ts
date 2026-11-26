import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { assignmentLookup } from '@/lib/model-labels/assignment-lookup';

/**
 * GET /api/videos/[id]/assignment
 * Fetches the current assignment for a video and user
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const assignmentId = searchParams.get('assignmentId');
    const labelType = searchParams.get('labelType') || 'OFFENSE';
    const lookup = assignmentLookup({ videoId, labelType, assignmentId, userId });

    // Get assignment with explicit field selection. Newest wins when no id is given.
    const assignment = await prisma.videoAssignment.findFirst({
      where: lookup.where,
      orderBy: lookup.orderBy,
      select: {
        id: true,
        videoId: true,
        userId: true,
        labelType: true,
        status: true,
        assignedAt: true,
        submittedAt: true,
        reviewedAt: true,
        notes: true,
        user: {
          select: {
            email: true,
            username: true,
            accountType: true,
          },
        },
      },
    });

    return NextResponse.json({ assignment }, { status: 200 });
  } catch (error) {
    console.error('[Assignment API] Error fetching assignment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignment' },
      { status: 500 }
    );
  }
}
