#!/usr/bin/env node
/**
 * Rewrite the Supabase project host baked into every Video.sourceUrls entry.
 *
 * Video.sourceUrls stores fully-qualified public URLs like
 *   https://<OLD_PROJECT>.supabase.co/storage/v1/object/public/fight-videos/...
 * (see scripts/rename-storage-paths.ts:200). After moving to a new Supabase
 * account these must point at the new project host or every video 404s.
 *
 * storagePath / storageProvider are provider-relative and left untouched.
 *
 * Run this AGAINST THE NEW DATABASE — DATABASE_URL (in my-app/.env or the
 * environment) must already point at the new project's Postgres.
 *
 * Required env vars:
 *   OLD_PROJECT_HOST   e.g. abcdold.supabase.co   (no scheme, no trailing slash)
 *   NEW_PROJECT_HOST   e.g. abcdnew.supabase.co
 * Optional:
 *   DRY_RUN            'true' to preview without writing
 *
 * Usage:
 *   OLD_PROJECT_HOST=abcdold.supabase.co NEW_PROJECT_HOST=abcdnew.supabase.co \
 *   npx tsx scripts/rewrite-source-urls.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`❌ Missing required env var: ${name}`);
    process.exit(1);
  }
  return v.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

const DRY_RUN = process.env.DRY_RUN === 'true';

async function main() {
  const oldHost = requireEnv('OLD_PROJECT_HOST');
  const newHost = requireEnv('NEW_PROJECT_HOST');

  if (oldHost === newHost) {
    console.error('❌ OLD_PROJECT_HOST and NEW_PROJECT_HOST are identical — nothing to do.');
    process.exit(1);
  }

  console.log('🔧 Rewriting Video.sourceUrls host');
  console.log(`   ${oldHost}  →  ${newHost}`);
  console.log(`   dry_run=${DRY_RUN}\n`);

  const videos = await prisma.video.findMany({
    select: { id: true, title: true, sourceUrls: true },
  });
  console.log(`📦 ${videos.length} videos in target DB\n`);

  let changed = 0;
  let urlsRewritten = 0;
  let stillStale = 0;

  for (const v of videos) {
    // sourceUrls is JSONB — typically a string[] but guard for anything else.
    const urls = Array.isArray(v.sourceUrls) ? (v.sourceUrls as unknown[]) : [];
    let touched = false;

    const next = urls.map((u) => {
      if (typeof u !== 'string') return u;
      if (u.includes(oldHost)) {
        touched = true;
        urlsRewritten++;
        return u.split(oldHost).join(newHost);
      }
      return u;
    });

    // Sanity: flag any URL still pointing at neither host (manual review).
    for (const u of next) {
      if (typeof u === 'string' && !u.includes(newHost) && u.includes('.supabase.co')) {
        stillStale++;
      }
    }

    if (!touched) continue;
    changed++;

    if (DRY_RUN) {
      console.log(`   [dry] ${v.title} (${v.id})`);
      next.forEach((u) => console.log(`         ${u}`));
      continue;
    }

    await prisma.video.update({
      where: { id: v.id },
      data: { sourceUrls: next as object },
    });
    console.log(`   ✅ ${v.title} (${v.id}) — ${urls.length} url(s)`);
  }

  console.log('\n──────── Summary ────────');
  console.log(`   videos changed:   ${changed}`);
  console.log(`   urls rewritten:   ${urlsRewritten}`);
  if (stillStale > 0) {
    console.log(`   ⚠️  ${stillStale} url(s) still reference a .supabase.co host that is NOT the new one — review manually.`);
  }
  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN — no rows written. Set DRY_RUN=false (or unset) to execute.');
  } else {
    console.log('\n✅ Done.');
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ Rewrite failed:', err);
  await prisma.$disconnect();
  process.exit(1);
});

export {};
