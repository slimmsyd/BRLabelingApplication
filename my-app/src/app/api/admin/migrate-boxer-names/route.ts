import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

/**
 * POST /api/admin/migrate-boxer-names
 * One-time migration: replaces "Boxer A"/"Boxer B" in Event records with real fighter names
 * from the associated Video's boxer1/boxer2 fields.
 *
 * Query params:
 *   ?dryRun=true  — preview what would change without writing (default: true)
 *   ?dryRun=false — actually write the changes
 *
 * Admin-only endpoint.
 */
export async function POST(request: Request) {
  try {
    // 1. Auth check
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { accountType: true, email: true },
    });

    if (!user || user.accountType !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 2. Check dry run mode (default: true for safety)
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dryRun') !== 'false';

    // 3. Find all events with generic boxer labels
    const events = await prisma.event.findMany({
      where: {
        boxer: { in: ['Boxer A', 'Boxer B'] },
      },
      select: {
        id: true,
        boxer: true,
        assignmentId: true,
        assignment: {
          select: {
            video: {
              select: {
                id: true,
                title: true,
                boxer1: true,
                boxer2: true,
              },
            },
          },
        },
      },
    });

    console.log(`[Migration] Found ${events.length} events with generic boxer labels`);

    // 4. Build update list
    const updates: { id: string; oldBoxer: string; newBoxer: string; videoTitle: string }[] = [];
    const skipped: { id: string; reason: string }[] = [];

    for (const event of events) {
      const video = event.assignment.video;
      let newBoxer: string | null = null;

      if (event.boxer === 'Boxer A' && video.boxer1) {
        newBoxer = video.boxer1;
      } else if (event.boxer === 'Boxer B' && video.boxer2) {
        newBoxer = video.boxer2;
      }

      if (newBoxer && newBoxer !== event.boxer) {
        updates.push({
          id: event.id,
          oldBoxer: event.boxer,
          newBoxer,
          videoTitle: video.title,
        });
      } else {
        skipped.push({
          id: event.id,
          reason: !newBoxer ? 'Video missing boxer name' : 'No change needed',
        });
      }
    }

    console.log(`[Migration] Will update: ${updates.length}, Will skip: ${skipped.length}`);

    // 5. Execute updates (unless dry run)
    if (!dryRun && updates.length > 0) {
      await prisma.$transaction(
        updates.map((u) =>
          prisma.event.update({
            where: { id: u.id },
            data: { boxer: u.newBoxer },
          })
        )
      );
      console.log(`[Migration] Successfully updated ${updates.length} events`);
    }

    return NextResponse.json({
      dryRun,
      totalFound: events.length,
      updated: dryRun ? 0 : updates.length,
      wouldUpdate: updates.length,
      skipped: skipped.length,
      preview: updates.slice(0, 20).map((u) => ({
        eventId: u.id,
        from: u.oldBoxer,
        to: u.newBoxer,
        video: u.videoTitle,
      })),
      message: dryRun
        ? `DRY RUN: Would update ${updates.length} events. Run with ?dryRun=false to apply.`
        : `Updated ${updates.length} events. ${skipped.length} skipped.`,
    });
  } catch (error) {
    console.error('[Migration] Error:', error);
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
}
