import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { canAssignRounds } from '@/lib/permissions';

/**
 * DELETE /api/videos/[id]/unassign
 * Removes an assignment from a video. Restricted to users in the ROUND_ASSIGNERS
 * allowlist (see src/lib/permissions.ts).
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!canAssignRounds(session.email)) {
      console.warn('[Unassign API] Forbidden: %s tried to unassign', session.email);
      return NextResponse.json(
        { error: 'You do not have permission to unassign rounds' },
        { status: 403 }
      );
    }

    const { id: videoId } = await params;
    const body = await request.json();
    const { assignmentId } = body;

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Assignment ID is required' },
        { status: 400 }
      );
    }

    // Verify the assignment exists and belongs to this video
    const assignment = await prisma.videoAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    if (assignment.videoId !== videoId) {
      return NextResponse.json(
        { error: 'Assignment does not belong to this video' },
        { status: 400 }
      );
    }

    // Delete the assignment
    await prisma.videoAssignment.delete({
      where: { id: assignmentId },
    });

    return NextResponse.json(
      { message: 'Assignment removed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Unassign API] Error removing assignment:', error);
    return NextResponse.json(
      { error: 'Failed to remove assignment' },
      { status: 500 }
    );
  }
}
