/**
 * Load fights, preview a model-label CSV, and replace that fight's labels
 * in one transaction. A failed write rolls the delete back.
 */

import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  modelAccountEmail,
  parseModelLabelCsv,
  planModelLabelImport,
  type ImportFightPlan,
  type ImportLabelType,
} from './parse-model-labels';
import { writeImportedLabels } from './write-imported-labels';

export class ImportConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportConflictError';
  }
}

export interface ModelLabelPreview {
  ok: true;
  totalIncoming: number;
  totalReplaced: number;
  needsOverride: boolean;
  fights: Array<{
    videoId: string;
    title: string;
    round: number;
    labelTypes: ImportLabelType[];
    labeledBy: string[];
    incoming: number;
    replaced: number;
    replacedBy: ImportFightPlan['replacedBy'];
    conflict: ImportFightPlan['conflict'];
  }>;
}

export type ModelLabelPlanResult =
  | ModelLabelPreview
  | { ok: false; status: number; error: string };

function presentPlan(plan: { fights: ImportFightPlan[]; totalIncoming: number; totalReplaced: number; needsOverride: boolean }): ModelLabelPreview {
  return {
    ok: true,
    totalIncoming: plan.totalIncoming,
    totalReplaced: plan.totalReplaced,
    needsOverride: plan.needsOverride,
    fights: plan.fights.map((fight) => ({
      videoId: fight.video.id,
      title: fight.video.title,
      round: fight.video.round,
      labelTypes: fight.labelTypes,
      labeledBy: fight.labeledBy,
      incoming: fight.rows.length,
      replaced: fight.replaced,
      replacedBy: fight.replacedBy,
      conflict: fight.conflict,
    })),
  };
}

export async function buildModelLabelPlan(csv: string): Promise<
  | { ok: true; preview: ModelLabelPreview; fights: ImportFightPlan[] }
  | { ok: false; status: number; error: string }
> {
  const parsed = parseModelLabelCsv(csv);
  if (!parsed.ok) {
    return { ok: false, status: 400, error: parsed.errors.slice(0, 12).join('\n') };
  }

  const videos = await prisma.video.findMany({
    select: { id: true, title: true, round: true, externalFightTitle: true },
  });
  const matched = planModelLabelImport(parsed.rows, videos);
  if (!matched.ok) {
    return { ok: false, status: 400, error: matched.error };
  }

  const existing = await prisma.videoAssignment.findMany({
    where: { videoId: { in: matched.fights.map((fight) => fight.video.id) } },
    select: {
      videoId: true,
      labelType: true,
      status: true,
      username: true,
      userEmail: true,
      _count: { select: { events: true } },
    },
  });
  const plan = planModelLabelImport(
    parsed.rows,
    videos,
    existing.map((assignment) => ({
      videoId: assignment.videoId,
      labelType: assignment.labelType,
      username: assignment.username,
      email: assignment.userEmail,
      eventCount: assignment._count.events,
      status: assignment.status,
    })),
  );
  if (!plan.ok) {
    return { ok: false, status: 400, error: plan.error };
  }
  return { ok: true, preview: presentPlan(plan), fights: plan.fights };
}

async function assertModelAccounts(fights: ImportFightPlan[]): Promise<string | null> {
  const names = [...new Set(fights.flatMap((fight) => fight.labeledBy))];
  const emails = [...new Set(names.map((name) => modelAccountEmail(name)))];
  const users = await prisma.user.findMany({
    where: { OR: [{ username: { in: names } }, { email: { in: emails } }] },
    select: { username: true, email: true, accountType: true },
  });

  for (const name of names) {
    const byName = users.find((user) => user.username === name);
    if (byName && byName.accountType !== 'MODEL') {
      return `"${name}" is already a ${byName.accountType} account. Model labels need their own model account. Nothing was imported.`;
    }
  }

  for (const name of names) {
    const email = modelAccountEmail(name);
    const byEmail = users.find((user) => user.email.toLowerCase() === email);
    if (byEmail && byEmail.username !== name) {
      return `Email ${email} already belongs to ${byEmail.username}. Nothing was imported.`;
    }
  }
  return null;
}

export async function commitModelLabels(
  csv: string,
  expectedReplaced?: number,
  overrideDisagreement = false,
): Promise<
  | { ok: true; imported: number; replaced: number; preview: ModelLabelPreview }
  | { ok: false; status: number; error: string }
> {
  const built = await buildModelLabelPlan(csv);
  if (!built.ok) return built;

  if (built.preview.needsOverride && !overrideDisagreement) {
    return {
      ok: false,
      status: 409,
      error: 'The CSV videoId names a different fight than the title and round. Confirm that override to import. Nothing was imported.',
    };
  }

  if (expectedReplaced !== undefined && expectedReplaced !== built.preview.totalReplaced) {
    return {
      ok: false,
      status: 409,
      error: `The fight changed since the check (${built.preview.totalReplaced} labels would be replaced now, the check showed ${expectedReplaced}). Check the file again. Nothing was imported.`,
    };
  }

  const accountError = await assertModelAccounts(built.fights);
  if (accountError) return { ok: false, status: 400, error: accountError };

  const names = [...new Set(built.fights.flatMap((fight) => fight.labeledBy))];
  const existingNames = new Set(
    (
      await prisma.user.findMany({
        where: { username: { in: names } },
        select: { username: true },
      })
    ).map((user) => user.username),
  );
  const passwordByName = new Map<string, string>();
  for (const name of names) {
    if (!existingNames.has(name)) {
      passwordByName.set(name, await bcrypt.hash(randomBytes(24).toString('hex'), 10));
    }
  }

  try {
    const written = await prisma.$transaction(async (tx) => {
      let replaced = 0;
      for (const fight of built.fights) {
        await tx.$queryRaw`SELECT id FROM "Video" WHERE id = ${fight.video.id} FOR UPDATE`;
        if (fight.labelTypes.length > 0) {
          await tx.$queryRaw`
            SELECT id FROM "VideoAssignment"
            WHERE "videoId" = ${fight.video.id}
              AND "labelType"::text IN (${Prisma.join(fight.labelTypes)})
            FOR UPDATE
          `;
        }
        const eventCount = await tx.event.count({
          where: {
            assignment: {
              videoId: fight.video.id,
              labelType: { in: fight.labelTypes },
            },
          },
        });
        const emptyAssignments = await tx.videoAssignment.count({
          where: {
            videoId: fight.video.id,
            labelType: { in: fight.labelTypes },
            events: { none: {} },
          },
        });
        replaced += eventCount + emptyAssignments;
      }
      if (expectedReplaced !== undefined && replaced !== expectedReplaced) {
        throw new ImportConflictError(
          `The fight changed since the check (${replaced} labels would be replaced now, the check showed ${expectedReplaced}). Check the file again. Nothing was imported.`,
        );
      }

      const accountByName = new Map<string, { id: string; email: string; username: string }>();
      for (const name of names) {
        const existing =
          (await tx.user.findUnique({ where: { username: name } })) ||
          (await tx.user.findUnique({ where: { id: name } }));
        if (existing) {
          if (existing.accountType !== 'MODEL') {
            throw new Error(`"${name}" is already a ${existing.accountType} account. Nothing was imported.`);
          }
          accountByName.set(name, {
            id: existing.id,
            email: existing.email,
            username: existing.username,
          });
          continue;
        }
        const created = await tx.user.create({
          data: {
            username: name,
            email: modelAccountEmail(name),
            password: passwordByName.get(name) || (await bcrypt.hash(randomBytes(24).toString('hex'), 10)),
            accountType: 'MODEL',
          },
        });
        accountByName.set(name, created);
      }

      const imported = await writeImportedLabels(tx as unknown as Parameters<typeof writeImportedLabels>[0], built.fights, accountByName);

      return { imported, replaced };
    }, { timeout: 20_000 });

    return { ok: true, ...written, preview: built.preview };
  } catch (error) {
    if (error instanceof ImportConflictError) {
      return { ok: false, status: 409, error: error.message };
    }
    throw error;
  }
}
