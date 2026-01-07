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
    const { userId, email, labelType = 'OFFENSE', targetUserId } = body;

    console.log('[Assign API] Received assignment request:', {
      videoId,
      requestingUserId: userId,
      targetUserId,
      labelType
    });

    // If targetUserId is provided (admin assigning to another user), use that
    // Otherwise, use the current user's userId (self-assignment)
    const assigneeUserId = targetUserId || userId;
    
    console.log('[Assign API] Assigning to user:', assigneeUserId);
    
    // We still need userId and email for auth purposes
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

    // IMPORTANT: Delete any existing assignments for this video and label type
    // This ensures when reassigning to a different user, we remove the old assignment
    const existingAssignments = await prisma.videoAssignment.findMany({
      where: {
        videoId,
        labelType,
      },
    });

    if (existingAssignments.length > 0) {
      console.log('[Assign API] Removing', existingAssignments.length, 'existing assignment(s) before reassigning');
      
      await prisma.videoAssignment.deleteMany({
        where: {
          videoId,
          labelType,
        },
      });
    }

    // Fetch the assignee user to get their email and username
    const assigneeUser = await prisma.user.findUnique({
      where: { id: assigneeUserId },
      select: { email: true, username: true },
    });

    if (!assigneeUser) {
      return NextResponse.json(
        { error: 'Assignee user not found' },
        { status: 404 }
      );
    }

    // Create new assignment
    const assignment = await prisma.videoAssignment.create({
      data: {
        videoId,
        userId: assigneeUserId,
        videoTitle: video.title, // Auto-populate from the video
        userEmail: assigneeUser.email, // Cache user email for admin visibility
        username: assigneeUser.username, // Cache username for admin visibility
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
