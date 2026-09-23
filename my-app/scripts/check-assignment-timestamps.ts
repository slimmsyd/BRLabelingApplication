import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main(){
  const a = await prisma.videoAssignment.findUnique({
    where: { id: 'cmpznwdgc0001i604nizehcvn' },
    select: { id:true, status:true, userEmail:true, assignedAt:true, pickedUpAt:true, submittedAt:true, reviewedAt:true, createdAt:true, updatedAt:true },
  });
  console.log('Tellez R2 assignment timestamps:');
  console.log(JSON.stringify(a, null, 2));
  // event createdAt span vs assignment submittedAt
  const ev = await prisma.event.findMany({ where:{assignmentId:'cmpznwdgc0001i604nizehcvn'}, select:{createdAt:true,updatedAt:true}});
  const days = new Set(ev.map(e=>e.createdAt.toISOString().slice(0,10)));
  console.log('event createdAt days:', [...days].sort());
  console.log('event updatedAt distinct:', new Set(ev.map(e=>e.updatedAt.toISOString())).size);
  await prisma.$disconnect();
}
main().catch(async e=>{console.error(e);await prisma.$disconnect();process.exit(1);});
