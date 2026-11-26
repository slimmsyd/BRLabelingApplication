import type { ImportFightPlan } from './parse-model-labels';

interface LabelAccount {
  id: string;
  email: string;
  username: string;
}

interface WriteTx {
  videoAssignment: {
    deleteMany: (args: { where: { videoId: string; labelType: { in: string[] } } }) => Promise<unknown>;
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
  };
  event: {
    createMany: (args: { data: Record<string, unknown>[] }) => Promise<unknown>;
  };
}

// Prisma's transaction client is passed at the call site. The structural methods above
// are what this function uses; the cast keeps the call from depending on generated enum types.

/** Delete the label types being replaced, then insert the model rows. Call this inside one transaction. */
export async function writeImportedLabels(
  tx: WriteTx,
  fights: ImportFightPlan[],
  accountByName: Map<string, LabelAccount>,
): Promise<number> {
  let imported = 0;
  for (const fight of fights) {
    await tx.videoAssignment.deleteMany({
      where: { videoId: fight.video.id, labelType: { in: fight.labelTypes } },
    });

    const buckets = new Map<string, typeof fight.rows>();
    for (const row of fight.rows) {
      const key = `${row.labeledBy}\0${row.labelType}`;
      const list = buckets.get(key) ?? [];
      list.push(row);
      buckets.set(key, list);
    }

    for (const bucket of buckets.values()) {
      const first = bucket[0];
      const account = accountByName.get(first.labeledBy);
      if (!account) throw new Error(`Missing model account for ${first.labeledBy}`);
      const assignment = await tx.videoAssignment.create({
        data: {
          videoId: fight.video.id,
          userId: account.id,
          videoTitle: fight.video.title,
          labelType: first.labelType,
          status: 'SUBMITTED',
          userEmail: account.email,
          username: account.username,
          submittedAt: new Date(),
          notes: `Imported model labels for ${account.username}`,
        },
      });
      await tx.event.createMany({
        data: bucket.map((row) => ({
          assignmentId: assignment.id,
          startTime: row.event.startTime,
          endTime: row.event.endTime,
          boxer: row.event.boxer,
          punchType: row.event.punchType,
          hand: row.event.hand,
          target: row.event.target,
          visibilityFlags: row.event.visibilityFlags,
          knockdown: row.event.knockdown,
          punchQuality: row.event.punchQuality,
          cam: row.event.cam,
          stance: row.event.stance,
          landed: row.event.landed,
          punchResult: row.event.punchResult,
          defenseType: row.event.defenseType,
          flagged: false,
          labeledBy: account.id,
          labeledByEmail: account.email,
          fightTitle: fight.video.title,
          ...(row.event.createdAt ? { createdAt: new Date(row.event.createdAt) } : {}),
        })),
      });
      imported += bucket.length;
    }
  }
  return imported;
}
