import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

/**
 * GET /api/videos/[id]
 * Fetches a single video by ID with all details
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const video = await prisma.video.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        boxer1: true,
        boxer2: true,
        round: true,
        segment: true,
        fightDate: true,
        fps: true,
        numCameraViews: true,
        sourceUrls: true,
        // storagePath: true, // Temporarily disabled due to build type error
        // storageProvider: true,
        duration: true,
        uploadedBy: true,
        archived: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { video },
      {
        status: 200,
        headers: {
          // Cache the video metadata + sourceUrls in the browser for 5 minutes,
          // and let it serve a stale copy for up to a day while revalidating.
          // Avoids re-hitting the DB (and re-issuing Supabase Storage URLs) on
          // every workspace re-mount or tab focus.
          'Cache-Control': 'private, max-age=300, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('[Video API] Error fetching video:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/videos/[id]
 * Deletes a video (admin only)
 * Cascade deletes all related assignments and events
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 1. Check authentication using session
    const session = await getSession();
    
    if (!session) {
      console.log('🚫 [Video DELETE] No active session');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.userId;

    // 2. Verify admin status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountType: true, email: true },
    });

    if (!user) {
      console.log('🚫 [Video DELETE] User not found:', userId);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.accountType !== 'ADMIN') {
      console.log('🚫 [Video DELETE] Non-admin user attempted deletion:', user.email);
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // 3. Check if video exists
    const video = await prisma.video.findUnique({
      where: { id },
      select: { 
        id: true, 
        title: true,
        assignments: {
          select: { id: true }
        }
      },
    });

    if (!video) {
      console.log('❌ [Video DELETE] Video not found:', id);
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // 4. Delete the video (cascade will handle assignments and events)
    await prisma.video.delete({
      where: { id },
    });

    console.log(
      `✅ [Video DELETE] Admin ${user.email} deleted video "${video.title}" (ID: ${id})`,
      `\n   - Cascade deleted ${video.assignments.length} assignment(s)`
    );

    return NextResponse.json(
      { 
        success: true, 
        message: 'Video deleted successfully',
        deletedVideoId: id 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ [Video DELETE] Error deleting video:', error);
    return NextResponse.json(
      { error: 'Failed to delete video' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/videos/[id]
 * Updates video metadata (title, boxer names, round)
 * Admin and QC users only
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { accountType: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.accountType !== 'ADMIN' && user.accountType !== 'QUALITY_CONTROL') {
      return NextResponse.json(
        { error: 'Forbidden: Admin or QC access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { boxer1, boxer2, round } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (boxer1 !== undefined) updateData.boxer1 = boxer1;
    if (boxer2 !== undefined) updateData.boxer2 = boxer2;
    if (round !== undefined) updateData.round = Number(round);

    // Auto-regenerate title from boxer names + round
    const video = await prisma.video.findUnique({
      where: { id },
      select: { boxer1: true, boxer2: true, round: true },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const finalBoxer1 = (updateData.boxer1 as string) || video.boxer1;
    const finalBoxer2 = (updateData.boxer2 as string) || video.boxer2;
    const finalRound = (updateData.round as number) ?? video.round;
    updateData.title = `${finalBoxer1} v ${finalBoxer2} - R${finalRound}`;

    const updatedVideo = await prisma.video.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        title: true,
        boxer1: true,
        boxer2: true,
        round: true,
      },
    });

    console.log(`[Video PATCH] ${user.email} updated video "${updatedVideo.title}" (ID: ${id})`);

    return NextResponse.json({ video: updatedVideo }, { status: 200 });
  } catch (error) {
    console.error('[Video PATCH] Error updating video:', error);
    return NextResponse.json(
      { error: 'Failed to update video' },
      { status: 500 }
    );
  }
}
