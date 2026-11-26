import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { buildModelLabelPlan, commitModelLabels } from '@/lib/model-labels/commit-model-labels';
import { canImportModelLabels } from '@/lib/model-labels/import-access';

export const dynamic = 'force-dynamic';

const MAX_CSV_CHARS = 2_000_000;

async function readCsv(request: NextRequest): Promise<{ csv: string; confirm: boolean; expectedReplaced?: number; overrideDisagreement: boolean } | { error: string }> {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = await request.json();
    const csv = typeof body.csv === 'string' ? body.csv : '';
    const expected = body.expectedReplaced;
    return {
      csv,
      confirm: body.confirm === true,
      expectedReplaced: typeof expected === 'number' ? expected : undefined,
      overrideDisagreement: body.overrideDisagreement === true,
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
    overrideDisagreement: form.get('overrideDisagreement') === 'true',
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

    if (input.expectedReplaced === undefined || !Number.isInteger(input.expectedReplaced)) {
      return NextResponse.json(
        { error: 'Confirm needs the replacement count from Check fight. Nothing was imported.' },
        { status: 400 },
      );
    }

    const committed = await commitModelLabels(input.csv, input.expectedReplaced, input.overrideDisagreement);
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
    const message = error instanceof Error ? error.message : '';
    const missingModelEnum =
      /invalid input value for enum/i.test(message) ||
      (/AccountType/i.test(message) && /MODEL/i.test(message));
    const clientMessage = missingModelEnum
      ? 'Apply the MODEL account migration before importing. Nothing was imported.'
      : 'Import failed. Nothing was imported.';
    return NextResponse.json({ error: clientMessage }, { status: 500 });
  }
}
