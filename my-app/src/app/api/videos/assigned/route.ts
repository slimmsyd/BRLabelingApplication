import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Safety ceiling so a single user's assignment list can never grow unbounded.
// Set well above the current per-user max (~205).
const ASSIGNED_CAP = 2000;

/**
 * GET /api/videos/assigned
 * Fetches all videos assigned to a specific user
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const assignments = await prisma.videoAssignment.findMany({
      where: {
        userId: userId,
        status: {
            not: 'COMPLETED' // Only show active assignments? Or all? Let's show all for now or filter in UI
        }
      },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            boxer1: true,
            boxer2: true,
            fightDate: true,
            round: true,
          }
        }
      },
      orderBy: {
        assignedAt: 'desc'
      },
      take: ASSIGNED_CAP
    });

    return NextResponse.json({ assignments }, { status: 200 });
  } catch (error) {
    console.error('[Assigned Videos API] Error fetching assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assigned videos' },
      { status: 500 }
    );
  }
}
