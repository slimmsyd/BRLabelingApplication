import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface EventInput {
  startTime: string;
  endTime: string;
  boxer: string;
  punchType: string;
  hand: string;
  target: string;
  visibilityFlags: string[];
  knockdown: boolean;
  punchQuality: string;
  cam?: string;
  stance?: string;
  landed?: boolean;
  punchResult?: string;
  defenseType?: string;
  labeledBy?: string;
  labeledByEmail?: string;
  fightTitle?: string;  // Fight identifier for external API alignment
}

interface SaveEventsBody {
  assignmentId: string;
  events: EventInput[];
  saveOnly?: boolean; // If true, don't mark as submitted (just save progress)
}

/**
 * POST /api/videos/[id]/events
 * Save events for a video assignment to the database
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    const body: SaveEventsBody = await request.json();
    const { assignmentId, events, saveOnly } = body;

    // Validate required fields
    if (!assignmentId || !events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Missing assignmentId or events array' },
        { status: 400 }
      );
    }

    // Verify the assignment exists and belongs to this video, include video for fightTitle
    const assignment = await prisma.videoAssignment.findFirst({
      where: {
        id: assignmentId,
        videoId: videoId,
      },
      include: {
        video: {
          select: { title: true }
        }
      }
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found or does not belong to this video' },
        { status: 404 }
      );
    }

    // Get fight title from video
    const fightTitle = assignment.video.title;

    // Delete existing events for this assignment (replace strategy)
    await prisma.event.deleteMany({
      where: { assignmentId },
    });

    // Create new events with fightTitle
    const createdEvents = await prisma.event.createMany({
      data: events.map((event) => ({
        assignmentId,
        startTime: event.startTime,
        endTime: event.endTime,
        boxer: event.boxer,
        punchType: event.punchType,
        hand: event.hand,
        target: event.target,
        visibilityFlags: event.visibilityFlags,
        knockdown: event.knockdown,
        punchQuality: event.punchQuality,
        cam: event.cam,
        stance: event.stance,
        landed: event.landed,
        punchResult: event.punchResult,
        defenseType: event.defenseType,
        labeledBy: event.labeledBy,
        labeledByEmail: event.labeledByEmail,
        fightTitle: event.fightTitle || fightTitle,  // Use provided or fetch from video
      })),
    });

    // Only update assignment status to SUBMITTED if NOT a saveOnly request
    if (!saveOnly) {
      await prisma.videoAssignment.update({
        where: { id: assignmentId },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      });
      console.log(`[Events API] Submitted ${createdEvents.count} events for assignment ${assignmentId}`);
    } else {
      console.log(`[Events API] Saved progress: ${createdEvents.count} events for assignment ${assignmentId} (not submitted)`);
    }

    return NextResponse.json({
      success: true,
      count: createdEvents.count,
      message: `Successfully saved ${createdEvents.count} events`,
    }, { status: 201 });

  } catch (error) {
    console.error('[Events API] Error saving events:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save events' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/videos/[id]/events
 * Retrieve events for a video (via assignment)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');

    // Build query - can filter by specific assignment or get all for video
    const whereClause = assignmentId
      ? { assignmentId }
      : { assignment: { videoId } };

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        assignment: {
          select: {
            id: true,
            labelType: true,
            user: {
              select: {
                username: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ events }, { status: 200 });

  } catch (error) {
    console.error('[Events API] Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
