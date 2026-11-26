/**
 * Offense P-hotkey punches: result and target belong to one punch.
 * Run: npx tsx --test src/lib/punch-tag/offense-hotkey-fields.test.ts
 *
 * Bug this guards: after tagging a punch M (or 2), the next punch was created
 * already Missed (or Body) because the hotkey wrote the value into the
 * sidebar form and new punches copied the form.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createInitialPunchTagState,
  nextPunchTagState,
  type PunchTagHotkeyState,
} from './punch-tag-state';
import {
  freshHotkeyPunchFields,
  hotkeyEditMirrorsForm,
  offenseKeyTarget,
  withHotkeyResult,
  withHotkeyTarget,
  type HotkeyPunchFields,
} from './offense-hotkey-fields';

type Punch = HotkeyPunchFields & { id: string };

/** Same wiring as the Offense branch of workspace/page.tsx. */
function session() {
  let state: PunchTagHotkeyState = createInitialPunchTagState();
  let punches: Punch[] = [];
  let pinned: string | null = null;
  let selected: string | null = null;
  const form = { punchResult: 'Landed', target: 'Head' };
  let now = 1000;
  let n = 0;

  const press = (code: string) => {
    now += 100;
    const newId = code === 'KeyP' ? `p${++n}` : undefined;
    const r = nextPunchTagState(state, code, now, newId);
    state = r.state;
    const a = r.action;
    if (a.kind === 'create' && newId) {
      pinned = newId;
      punches = [{ id: newId, ...freshHotkeyPunchFields() }, ...punches];
    } else if (a.kind === 'setResult') {
      const id = offenseKeyTarget(a.tagId, pinned);
      punches = punches.map((p) => (p.id === id ? withHotkeyResult(p, a.result) : p));
      const open = punches.find((p) => p.id === id);
      if (open && hotkeyEditMirrorsForm(id, selected)) form.punchResult = open.punchResult || '';
    } else if (a.kind === 'setTarget') {
      const id = offenseKeyTarget(a.tagId, pinned);
      punches = punches.map((p) => (p.id === id ? withHotkeyTarget(p, a.target) : p));
      if (hotkeyEditMirrorsForm(id, selected)) form.target = a.target;
    }
  };
  const open = (id: string) => {
    pinned = id;
    selected = id;
  };
  const get = (id: string) => punches.find((p) => p.id === id)!;
  return { press, open, get, form };
}

test('a new punch does not inherit the previous punch result (Olly: jab M, next punch lands)', () => {
  const s = session();
  s.press('KeyP'); s.press('KeyJ'); s.press('KeyM');
  assert.equal(s.get('p1').punchResult, 'Missed');
  s.press('KeyP'); s.press('KeyC');
  assert.equal(s.get('p2').punchResult, undefined, 'second punch starts with no result');
  assert.equal(s.get('p2').landed, undefined);
  s.press('KeyI');
  assert.equal(s.get('p2').punchResult, 'Landed');
  assert.equal(s.get('p1').punchResult, 'Missed', 'first punch untouched');
});

test('the result of one punch can be changed any number of times', () => {
  const s = session();
  s.press('KeyP');
  for (const [code, want] of [['KeyM', 'Missed'], ['KeyI', 'Landed'], ['KeyM', 'Missed'], ['KeyI', 'Landed']] as const) {
    s.press(code);
    assert.equal(s.get('p1').punchResult, want);
    assert.equal(s.get('p1').landed, want === 'Landed');
  }
});

test('target starts unset on each punch and 1/2 change only that punch', () => {
  const s = session();
  s.press('KeyP'); s.press('Digit2');
  assert.equal(s.get('p1').target, 'Body');
  s.press('KeyP');
  assert.equal(s.get('p2').target, '', 'second punch starts with no target');
  s.press('Digit1');
  assert.equal(s.get('p2').target, 'Head');
  s.press('Digit2'); s.press('Digit1');
  assert.equal(s.get('p2').target, 'Head', 'target changes more than once');
  assert.equal(s.get('p1').target, 'Body');
});

test('hotkeys never write into the sidebar form for a new punch', () => {
  const s = session();
  s.press('KeyP'); s.press('KeyM'); s.press('Digit2');
  assert.deepEqual(s.form, { punchResult: 'Landed', target: 'Head' });
});

test('a punch opened in the sidebar is the one I/M and 1/2 correct, and the form follows it', () => {
  const s = session();
  s.press('KeyP'); s.press('KeyM');
  s.press('KeyP'); s.press('KeyI');
  s.open('p1');
  s.press('KeyI'); s.press('Digit2');
  assert.equal(s.get('p1').punchResult, 'Landed');
  assert.equal(s.get('p1').target, 'Body');
  assert.equal(s.get('p2').punchResult, 'Landed', 'newest punch untouched');
  assert.deepEqual(s.form, { punchResult: 'Landed', target: 'Body' });
  s.press('KeyP');
  assert.equal(s.get('p3').punchResult, undefined, 'P after editing still starts clean');
  s.press('KeyM');
  assert.equal(s.get('p3').punchResult, 'Missed');
  assert.equal(s.get('p1').punchResult, 'Landed');
});

test('punches stored with I/M codes keep codes', () => {
  assert.equal(withHotkeyResult({ target: 'Head', punchResult: 'I', landed: true }, 'M').punchResult, 'M');
  assert.equal(withHotkeyResult({ target: 'Head', punchResult: 'Defended', landed: false }, 'I').punchResult, 'Landed');
});
