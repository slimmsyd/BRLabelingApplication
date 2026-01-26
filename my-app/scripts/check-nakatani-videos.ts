
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const videos = await prisma.video.findMany({
    where: {
      OR: [
        { title: { contains: 'Nakatani', mode: 'insensitive' } },
        { boxer1: { contains: 'Nakatani', mode: 'insensitive' } },
        { boxer2: { contains: 'Nakatani', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      title: true,
      round: true,
      storagePath: true,
      sourceUrls: true,
    },
    orderBy: {
      round: 'asc',
    }
  });

  console.log('Found Videos:', videos.length);
  videos.filter(v => v.round < 7).forEach(v => {
    console.log(`ROI: [${v.round}] ${v.title} | Path: ${v.storagePath} | ID: ${v.id}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
