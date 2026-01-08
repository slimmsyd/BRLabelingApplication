import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

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

    return NextResponse.json({ video }, { status: 200 });
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
    
    // 1. Check authentication
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    
    if (!userId) {
      console.log('🚫 [Video DELETE] No user ID in session');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
