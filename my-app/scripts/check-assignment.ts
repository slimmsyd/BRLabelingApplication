
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const assignments = await prisma.videoAssignment.findMany({
    where: {
      video: {
        title: { contains: 'Nakatani', mode: 'insensitive' }
      }
    },
    include: { video: true },
    orderBy: { video: { round: 'asc' } }
  });

  console.log(`Found ${assignments.length} assignments`);
  
  // Group by Round to see if multiple assignments point to different things
  assignments.forEach(a => {
    console.log(`[R${a.video.round}] AssignID: ${a.id} -> VideoID: ${a.video.id} (Path: ${a.video.storagePath}) Status: ${a.status}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
