import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const ASSIGNMENT_ID = 'cmpznwdgc0001i604nizehcvn';
function day(d: Date){return d.toISOString().slice(0,10);}
async function main(){
  const ev = await prisma.event.findMany({
    where: { assignmentId: ASSIGNMENT_ID },
    select: { createdAt: true, updatedAt: true },
  });
  console.log(`Total events for assignment: ${ev.length}`);
  const byCreated = new Map<string,number>();
  for (const e of ev) byCreated.set(day(e.createdAt),(byCreated.get(day(e.createdAt))??0)+1);
  console.log('createdAt by day:', [...byCreated.entries()].sort());
  const upd = new Set(ev.map(e=>e.updatedAt.toISOString()));
  console.log(`distinct updatedAt values: ${upd.size}`);
  console.log('updatedAt sample:', [...upd].slice(0,5));
  const createdAfterThu = ev.filter(e=>day(e.createdAt)==='2026-06-04').length;
  console.log(`Thursday(06-04) createdAt count: ${createdAfterThu}`);
  await prisma.$disconnect();
}
main().catch(async e=>{console.error(e);await prisma.$disconnect();process.exit(1);});
