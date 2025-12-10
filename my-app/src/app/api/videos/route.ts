import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/videos
 * Fetches all videos from the database
 */
export async function GET() {
  try {
    const videos = await prisma.video.findMany({
      orderBy: {
        createdAt: 'desc', // Newest first
      },
      select: {
        id: true,
        title: true,
        boxer1: true,
        boxer2: true,
        round: true,
        fightDate: true,
        fps: true,
        numCameraViews: true,
        sourceUrls: true,
        // storagePath: true,
        // storageProvider: true,
        createdAt: true,
        updatedAt: true,
        assignments: {
          take: 1,
          where: { labelType: 'OFFENSE' },
          select: {
            user: {
              select: {
                username: true,
                email: true,
              },
            },
            status: true,
          },
        },
      },
    });

    return NextResponse.json({ videos }, { status: 200 });
  } catch (error) {
    console.error('[Videos API] Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}
