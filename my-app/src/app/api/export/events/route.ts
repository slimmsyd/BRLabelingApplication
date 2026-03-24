import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

/**
 * GET /api/export/events
 * Returns a JSON list of events matching filter criteria, with signed video URLs.
 * Used by the Admin Clip Export panel to feed data to the client-side FFmpeg processor.
 *
 * Admin-only endpoint.
 */
export async function GET(request: Request) {
  try {
    // 1. Auth check
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { accountType: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Parse filter query params
    const { searchParams } = new URL(request.url);
    const punchType = searchParams.get('punchType');
    const hand = searchParams.get('hand');
    const target = searchParams.get('target');
    const stance = searchParams.get('stance');
    const landed = searchParams.get('landed');
    const fightTitle = searchParams.get('fightTitle');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 200;

    // 3. Build Prisma where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (punchType && punchType !== 'any') where.punchType = punchType;
    if (hand && hand !== 'any') where.hand = hand;
    if (target && target !== 'any') where.target = target;
    if (stance && stance !== 'any') where.stance = stance;
    if (landed === 'true') where.landed = true;
    if (landed === 'false') where.landed = false;
    if (fightTitle) where.fightTitle = { contains: fightTitle, mode: 'insensitive' };

    // 4. Query events with associated video URLs
    const events = await prisma.event.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        assignment: {
          include: {
            video: {
              select: {
                id: true,
                title: true,
                sourceUrls: true,
                fps: true,
              },
            },
          },
        },
      },
    });

    // 5. Shape response — return event data + the source video URLs
    const results = events.map((e) => ({
      eventId: e.id,
      startTime: e.startTime,
      endTime: e.endTime,
      boxer: e.boxer,
      punchType: e.punchType,
      hand: e.hand,
      target: e.target,
      stance: e.stance,
      landed: e.landed,
      punchResult: e.punchResult,
      cam: e.cam,
      fightTitle: e.fightTitle,
      videoId: e.assignment.video.id,
      videoTitle: e.assignment.video.title,
      // Source URLs are already public Supabase/S3 URLs
      sourceUrls: e.assignment.video.sourceUrls as string[],
      fps: e.assignment.video.fps,
    }));

    return NextResponse.json({ events: results, total: results.length }, { status: 200 });
  } catch (error) {
    console.error('[Export Events API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch events for export' }, { status: 500 });
  }
}
