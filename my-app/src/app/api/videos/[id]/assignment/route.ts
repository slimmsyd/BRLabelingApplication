import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    const labelType = searchParams.get('labelType') as any || 'OFFENSE';

    const whereClause: any = {
      videoId,
      labelType, // Default to OFFENSE to check main assignment
    };

    // If userId provided, check specifically for that user
    if (userId) {
      whereClause.userId = userId;
    }

    // Get assignment
    const assignment = await prisma.videoAssignment.findFirst({
      where: whereClause,
      include: {
        user: {
          select: {
            email: true,
            username: true,
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
