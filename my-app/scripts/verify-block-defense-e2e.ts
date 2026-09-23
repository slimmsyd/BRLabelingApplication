import { prisma } from '../src/lib/prisma';

// Read-only verification that the live Supabase Postgres DB accepts and
// returns defenseType values, including the new 'Block' option.
async function main() {
    // 1. Column exists + is queryable: count by defenseType value
    const counts = await prisma.event.groupBy({
        by: ['defenseType'],
        _count: { _all: true },
    });
    console.log('defenseType distribution in live DB:');
    for (const c of counts) {
        console.log(`  ${c.defenseType ?? '(null — non-defended events)'}: ${c._count._all}`);
    }

    // 2. Distribution of punchResult values for context
    const results = await prisma.event.groupBy({
        by: ['punchResult'],
        _count: { _all: true },
    });
    console.log('punchResult distribution:');
    for (const r of results) {
        console.log(`  ${r.punchResult ?? '(null — legacy events)'}: ${r._count._all}`);
    }

    // 3. Round-trip test: insert a Defended+Block event on the most recent
    //    assignment, read it back, then delete it.
    const assignment = await prisma.videoAssignment.findFirst({
        orderBy: { assignedAt: 'desc' },
        select: { id: true },
    });
    if (!assignment) {
        console.log('No assignments found — skipping round-trip test.');
        return;
    }
    const created = await prisma.event.create({
        data: {
            assignmentId: assignment.id,
            startTime: '00:00.00',
            endTime: '00:00.01',
            boxer: 'Boxer A',
            punchType: 'Jab',
            hand: 'Lead (L)',
            target: 'Head',
            visibilityFlags: [],
            knockdown: false,
            punchQuality: '1',
            punchResult: 'Defended',
            defenseType: 'Block',
            landed: false,
            fightTitle: '[verification] block e2e test',
        },
    });
    const readBack = await prisma.event.findUnique({
        where: { id: created.id },
        select: { punchResult: true, defenseType: true },
    });
    console.log('Round-trip INSERT/SELECT on Supabase:', readBack);
    await prisma.event.delete({ where: { id: created.id } });
    console.log('CLEANUP OK (test event deleted)');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
