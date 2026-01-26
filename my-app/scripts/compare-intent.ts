
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const INTENDED = [
  { id: 'cmk78ihal0000k104nbxb8rvm', title: 'R3', oldFolder: 'r1', newFolder: 'r3' },
  { id: 'cmk78kuq70000l804cdtp539u', title: 'R4', oldFolder: 'r2', newFolder: 'r4' },
  { id: 'cmk78nwhs0000jp04ftex8ac9', title: 'R5', oldFolder: 'r3', newFolder: 'r5' },
  { id: 'cmk78qfpk0000la04ry4sq25t', title: 'R6', oldFolder: 'r4', newFolder: 'r6' },
  { id: 'cmk78tqjd0001l804h7nofoi9', title: 'R7', oldFolder: 'r5', newFolder: 'r7' },
];

async function main() {
  console.log('--- COMPARING INTENT VS DB ---');
  for (const item of INTENDED) {
    const video = await prisma.video.findUnique({
      where: { id: item.id },
      include: { assignments: { select: { id: true, labelType: true, status: true } } }
    });

    if (video) {
        console.log(`Video ID: ${item.id}`);
        console.log(`  Intended As: ${item.title} (Folder: ${item.newFolder})`);
        console.log(`  Current DB Title: ${video.title}`);
        console.log(`  Current DB Round: ${video.round}`);
        console.log(`  Current DB Path:  ${video.storagePath}`);
        console.log(`  Assignments: ${video.assignments.length}`);
        video.assignments.forEach(a => console.log(`    - AssignmentsID: ${a.id} (${a.labelType}) [${a.status}]`));
    } else {
        console.log(`Video ID: ${item.id} NOT FOUND IN DB`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
