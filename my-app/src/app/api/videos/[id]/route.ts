import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
        storagePath: true,
        storageProvider: true,
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
