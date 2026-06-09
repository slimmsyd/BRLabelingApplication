// Anonymous feedback endpoint. NO user id / session is read or stored,
// so submissions cannot be traced back to a person — that's the point.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const CATEGORIES = ['general', 'bug', 'idea', 'friction'] as const;
type Category = (typeof CATEGORIES)[number];

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // ── validate (anonymous: we accept ONLY these fields, nothing identifying) ──
        const category: Category = CATEGORIES.includes(body?.category) ? body.category : 'general';
        const rating: number | null =
            typeof body?.rating === 'number' && body.rating >= 1 && body.rating <= 5 ? body.rating : null;
        const comment: string | null =
            typeof body?.comment === 'string' && body.comment.trim().length > 0
                ? body.comment.trim().slice(0, 2000)
                : null;
        const path: string | null =
            typeof body?.path === 'string' ? body.path.slice(0, 256) : null;

        // require at least a rating OR a comment
        if (rating === null && comment === null) {
            return NextResponse.json({ error: 'Empty feedback' }, { status: 400 });
        }

        await prisma.feedback.create({
            data: { category, rating, comment, path },
        });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('[feedback] error', err);
        return NextResponse.json({ error: 'Failed to record feedback' }, { status: 500 });
    }
}
