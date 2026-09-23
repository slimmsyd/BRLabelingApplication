import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
const prisma = new PrismaClient();
const ASSIGN = 'cmpznwdgc0001i604nizehcvn';        // Tellez v Mendoza R2
const VIDEO  = 'cmpzltzd70000jp04w4ihdk1x';
const friStart = new Date('2026-06-05T00:00:00.000Z');
const friEnd   = new Date('2026-06-05T23:59:59.999Z');

// match the export's date style (UTC) e.g. "6/4/2026, 3:47:41 PM"
function fmt(d: Date) {
  return d.toLocaleString('en-US', { timeZone: 'UTC', month:'numeric', day:'numeric', year:'numeric',
    hour:'numeric', minute:'2-digit', second:'2-digit', hour12:true });
}
function esc(v: any) { const s = v==null?'':String(v); return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; }

async function main() {
  // HOW THE TOTAL WAS CONFIRMED: exact Round-Export query (no date filter)
  const total = await prisma.event.count({ where: { assignment: { videoId: VIDEO } } });
  const inFriday = await prisma.event.count({ where: { assignmentId: ASSIGN, createdAt:{gte:friStart, lte:friEnd} } });

  // WHERE THE MISSING 46 ARE: same assignment, createdAt = Thursday (before the Fri window)
  const missing = await prisma.event.findMany({
    where: { assignmentId: ASSIGN, createdAt: { lt: friStart } },
    include: { assignment: { include: { video: true } } },
    orderBy: { startTime: 'asc' },
  });

  console.log(`TOTAL for R2 (round-export query, no date filter): ${total}`);
  console.log(`In the Friday report (createdAt 6/5):               ${inFriday}`);
  console.log(`MISSING = createdAt before 6/5 (Thursday 6/4):      ${missing.length}`);
  console.log(`Cross-check: ${inFriday} + ${missing.length} = ${inFriday + missing.length}`);
  const days = new Set(missing.map(e=>e.createdAt.toISOString().slice(0,10)));
  console.log(`All 46 share assignment: ${new Set(missing.map(e=>e.assignmentId)).size===1 ? missing[0].assignmentId : 'MIXED'}`);
  console.log(`All 46 createdAt day(s): ${[...days].join(', ')}`);

  // WRITE the deliverable CSV (same schema as the events-export the client uses)
  const header = ['id','assignmentId','startTime','endTime','boxer','punchType','hand','target','visibilityFlags','knockdown','punchQuality','cam','stance','landed','punchResult','defenseType','labeledBy','labeledByEmail','fightTitle','createdAt','updatedAt','videoTitle','assignmentStatus','assignmentLabelType','originalLabelerEmail','isQC'];
  const rows = missing.map(e => [
    e.id, e.assignmentId, e.startTime, e.endTime, e.boxer, e.punchType, e.hand, e.target,
    e.visibilityFlags.join(';'), e.knockdown, e.punchQuality, e.cam, e.stance, e.landed, e.punchResult, e.defenseType,
    e.labeledBy, e.labeledByEmail, e.fightTitle, fmt(e.createdAt), fmt(e.updatedAt),
    e.assignment.video.title, e.assignment.status, e.assignment.labelType, e.assignment.userEmail,
    e.assignment.userEmail !== e.labeledByEmail,
  ].map(esc).join(','));
  const out = `/Users/sydneysanders/Desktop/tellez-r2-MISSING-thursday-${missing.length}-events.csv`;
  fs.writeFileSync(out, [header.join(','), ...rows].join('\n') + '\n');
  console.log(`\nWrote ${missing.length} rows -> ${out}`);
  await prisma.$disconnect();
}
main().catch(async e=>{console.error(e);await prisma.$disconnect();process.exit(1);});
