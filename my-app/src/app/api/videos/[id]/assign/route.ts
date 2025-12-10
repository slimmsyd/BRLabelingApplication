import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/videos/[id]/assign
 * Assigns the current user to a video
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    const body = await request.json();
    const { userId, email, labelType = 'OFFENSE' } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User ID and email are required' },
        { status: 400 }
      );
    }

    // Check if video exists
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Check if already assigned to this user for this label type
    const existingAssignment = await prisma.videoAssignment.findUnique({
      where: {
        videoId_userId_labelType: {
          videoId,
          userId,
          labelType,
        },
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { assignment: existingAssignment },
        { status: 200 }
      );
    }

    // Create new assignment
    const assignment = await prisma.videoAssignment.create({
      data: {
        videoId,
        userId,
        labelType,
        status: 'ASSIGNED',
      },
      include: {
        user: {
          select: {
            email: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    console.error('[Assign API] Error assigning video:', error);
    return NextResponse.json(
      { error: 'Failed to assign video' },
      { status: 500 }
    );
  }
}
