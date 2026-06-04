import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { canAssignRounds } from '@/lib/permissions';

/**
 * POST /api/videos/[id]/assign
 * Self-pickup: any logged-in user can assign an unassigned round to themselves.
 * Assigning to ANOTHER user (re-assign) requires being in the ROUND_ASSIGNERS
 * allowlist (see src/lib/permissions.ts).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    const body = await request.json();
    const { labelType = 'OFFENSE', targetUserId } = body;

    // Identity comes from the signed session cookie — never trust the body for auth.
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // targetUserId = assigning to someone else; otherwise self-pickup.
    const assigneeUserId = targetUserId || session.userId;

    console.log('[Assign API] Received assignment request:', {
      videoId,
      requesterId: session.userId,
      assigneeUserId,
      labelType,
    });

    // Assigning to another user requires the round-assign permission.
    if (assigneeUserId !== session.userId && !canAssignRounds(session.email)) {
      console.warn('[Assign API] Forbidden: %s tried to assign to %s', session.email, assigneeUserId);
      return NextResponse.json(
        { error: 'You do not have permission to assign rounds to other users' },
        { status: 403 }
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
