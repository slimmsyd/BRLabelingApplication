import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

/**
 * GET /api/export/titles
 * Returns a list of unique, non-null fight titles from the Event table.
 * Used for autocompletion in the Admin Clip Export panel.
 *
 * Admin-only endpoint.
 */
export async function GET() {
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

    if (!user || user.accountType !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 2. Query distinct fight titles
    const eventsWithTitles = await prisma.event.findMany({
      where: {
        fightTitle: {
          not: null,
          notIn: [''],
        },
      },
      select: {
        fightTitle: true,
      },
      distinct: ['fightTitle'],
      orderBy: {
        fightTitle: 'asc',
      },
    });

    // 3. Extract strings from result objects
    const titles = eventsWithTitles.map((e) => e.fightTitle as string);

    return NextResponse.json({ titles }, { status: 200 });
  } catch (error) {
    console.error('[Export Titles API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch fight titles' }, { status: 500 });
  }
}
