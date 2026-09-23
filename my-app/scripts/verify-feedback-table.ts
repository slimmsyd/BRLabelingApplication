import { prisma } from '../src/lib/prisma';

async function main() {
    const created = await prisma.feedback.create({
        data: { category: 'general', rating: 5, comment: '[verification] end-to-end table check', path: '/verify' },
    });
    console.log('INSERT OK:', created.id);
    const rows = await prisma.feedback.findMany({ orderBy: { createdAt: 'desc' }, take: 3 });
    console.log('SELECT OK, latest rows:', rows.map(r => ({ id: r.id, category: r.category, rating: r.rating, comment: r.comment })));
    await prisma.feedback.delete({ where: { id: created.id } });
    console.log('CLEANUP OK (test row deleted)');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
