import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { VideoStatus } from '@prisma/client';

/**
 * PATCH /api/videos/[id]/status
 * Updates the status of a video assignment
 * 
 * Workflow:
 * - ASSIGNED → IN_PROGRESS (labeler starts work)
 * - IN_PROGRESS → SUBMITTED (labeler finishes)
 * - SUBMITTED → REVIEWED (QC reviews)
 * - REVIEWED → COMPLETED (final approval)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status, assignmentId } = body;

    // Validate status
    const validStatuses = ['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REVIEWED', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Fetch the user to check permissions
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, accountType: true, permissions: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch the assignment
    const assignment = await prisma.videoAssignment.findFirst({
      where: assignmentId 
        ? { id: assignmentId }
        : { videoId, labelType: 'OFFENSE' },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Permission checks based on status transition
    const isAdmin = user.accountType === 'ADMIN';
    const isQC = user.accountType === 'QUALITY_CONTROL' || (user.permissions as any)?.QC === true;
    const isOwner = assignment.userId === user.id;

    // Labelers can only update their own assignments to certain statuses
    if (!isAdmin) {
      if (status === 'REVIEWED' || status === 'COMPLETED') {
        if (!isQC) {
          return NextResponse.json(
            { error: 'Only QC or Admin can mark as REVIEWED or COMPLETED' },
            { status: 403 }
          );
        }
      }
      
      if (status === 'SUBMITTED' && !isOwner && !isQC) {
        return NextResponse.json(
          { error: 'Only the assigned user can submit' },
          { status: 403 }
        );
      }
    }

    // Build update data with appropriate timestamps based on status
    const updateData: {
      status: VideoStatus;
      updatedAt: Date;
      pickedUpAt?: Date;
      submittedAt?: Date;
      reviewedAt?: Date;
    } = {
      status: status as VideoStatus,
      updatedAt: new Date(),
    };

    // Set appropriate timestamp based on status transition
    if (status === 'IN_PROGRESS' && !assignment.pickedUpAt) {
      updateData.pickedUpAt = new Date();
    }
    if (status === 'SUBMITTED') {
      updateData.submittedAt = new Date();
    }
    if (status === 'REVIEWED') {
      updateData.reviewedAt = new Date();
    }

    // Update the assignment status
    const updatedAssignment = await prisma.videoAssignment.update({
      where: { id: assignment.id },
      data: updateData,
      include: {
        video: {
          select: {
            id: true,
            title: true,
            boxer1: true,
            boxer2: true,
          },
        },
      },
    });

    console.log(`[Status Update] Video "${updatedAssignment.video.title}" → ${status} by ${session.email}`);

    return NextResponse.json({
      success: true,
      assignment: updatedAssignment,
      message: `Status updated to ${status}`,
    });
  } catch (error) {
    console.error('[Status Update API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    );
  }
}

