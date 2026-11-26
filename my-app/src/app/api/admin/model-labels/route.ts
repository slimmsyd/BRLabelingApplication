import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { canAssignRounds } from '@/lib/permissions';
import { buildModelLabelPlan, commitModelLabels } from '@/lib/model-labels/commit-model-labels';

export const dynamic = 'force-dynamic';

const MAX_CSV_CHARS = 2_000_000;

function canImportModelLabels(user: { accountType: string; email: string }): boolean {
  return user.accountType === 'ADMIN' || canAssignRounds(user.email);
}

async function readCsv(request: NextRequest): Promise<{ csv: string; confirm: boolean; expectedReplaced?: number } | { error: string }> {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = await request.json();
    const csv = typeof body.csv === 'string' ? body.csv : '';
    const expected = body.expectedReplaced;
    return {
      csv,
      confirm: body.confirm === true,
      expectedReplaced: typeof expected === 'number' ? expected : undefined,
    };
  }

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return { error: 'Choose a CSV file.' };
  }
  const csv = await file.text();
  const expectedRaw = form.get('expectedReplaced');
  const expectedReplaced =
    typeof expectedRaw === 'string' && expectedRaw !== '' ? Number(expectedRaw) : undefined;
  return {
    csv,
    confirm: form.get('confirm') === 'true',
    expectedReplaced: expectedReplaced !== undefined && Number.isFinite(expectedReplaced) ? expectedReplaced : undefined,
  };
}

/**
 * POST /api/admin/model-labels
 * Without confirm, returns which fight matched and how many labels would be replaced.
 * With confirm, replaces those labels as the CSV's labeledBy model account.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { accountType: true, email: true },
    });
    if (!user || !canImportModelLabels(user)) {
      return NextResponse.json({ error: 'Only an admin or round owner can import model labels.' }, { status: 403 });
    }

    const input = await readCsv(request);
    if ('error' in input) {
      return NextResponse.json({ error: input.error }, { status: 400 });
    }
    if (!input.csv.trim()) {
      return NextResponse.json({ error: 'The CSV is empty. Nothing was imported.' }, { status: 400 });
    }
    if (input.csv.length > MAX_CSV_CHARS) {
      return NextResponse.json({ error: 'That CSV is too large. Nothing was imported.' }, { status: 400 });
    }

    if (!input.confirm) {
      const preview = await buildModelLabelPlan(input.csv);
      if (!preview.ok) {
        return NextResponse.json({ error: preview.error }, { status: preview.status });
      }
      return NextResponse.json({ preview: true, ...preview.preview });
    }

    const committed = await commitModelLabels(input.csv, input.expectedReplaced);
    if (!committed.ok) {
      return NextResponse.json({ error: committed.error }, { status: committed.status });
    }
    return NextResponse.json({
      preview: false,
      imported: committed.imported,
      replaced: committed.replaced,
      fights: committed.preview.fights,
    });
  } catch (error) {
    console.error('[Model labels] import failed', error);
    const message = error instanceof Error ? error.message : 'Import failed';
    return NextResponse.json({ error: `${message} Nothing was imported.` }, { status: 500 });
  }
}
