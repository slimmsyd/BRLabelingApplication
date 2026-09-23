// Example: my-app/src/app/api/feedback/route.ts
//
// Minimal anonymous feedback endpoint. NO user id / session is read or stored,
// so submissions cannot be traced back to a person — that's the point.
//
// This is a starting point — wire the insert to however you persist data
// (Prisma shown below; swap for your ORM/table). If you don't want a DB yet,
// the console.log alone is enough to start collecting in your server logs.

import { NextResponse } from 'next/server';
// import { prisma } from '@/lib/prisma'; // <-- your existing Prisma client

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

        // ── persist (example with Prisma — see schema note in README) ──
        // await prisma.feedback.create({
        //     data: { category, rating, comment, path },
        // });

        console.log('[feedback]', { category, rating, comment, path });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('[feedback] error', err);
        return NextResponse.json({ error: 'Failed to record feedback' }, { status: 500 });
    }
}
