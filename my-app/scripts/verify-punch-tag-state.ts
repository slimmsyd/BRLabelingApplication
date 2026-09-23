/**
 * Verifies punch-tag key reducer sequences.
 * Run: npx tsx scripts/verify-punch-tag-state.ts
 */

import {
  createInitialPunchTagState,
  expirePunchTagWindow,
  nextPunchTagState,
} from '../src/lib/punch-tag/punch-tag-state';
import { PUNCH_TAG_REFINE_WINDOW_MS } from '../src/lib/event-helpers';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${message}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${message}`);
  }
}

console.log('1. P alone creates Punch and opens window');
{
  let state = createInitialPunchTagState();
  const { state: next, action } = nextPunchTagState(state, 'KeyP', 1000, 'tag-1');
  assert(action.kind === 'create' && action.type === 'Punch', 'action is create Punch');
  assert(next.refineWindow?.tagId === 'tag-1', 'window targets new tag');
  assert(next.lastKey === 'P' && next.lastType === 'Punch', 'readout shows P → Punch');
}

console.log('2. P then U then O inside window ends as Overhand');
{
  let state = createInitialPunchTagState();
  let r = nextPunchTagState(state, 'KeyP', 1000, 'tag-2');
  state = r.state;
  r = nextPunchTagState(state, 'KeyU', 1200);
  assert(r.action.kind === 'refine' && r.action.type === 'Uppercut', 'U refines to Uppercut');
  assert(r.action.kind === 'refine' && r.action.tagId === 'tag-2', 'same tag id');
  state = r.state;
  r = nextPunchTagState(state, 'KeyO', 1400);
  assert(r.action.kind === 'refine' && r.action.type === 'Overhand', 'O replaces with Overhand');
  assert(r.state.lastKey === 'O' && r.state.lastType === 'Overhand', 'readout shows O → Overhand');
}

console.log('3. Letter after window closes is a hint');
{
  let state = createInitialPunchTagState();
  let r = nextPunchTagState(state, 'KeyP', 1000, 'tag-3');
  state = r.state;
  state = expirePunchTagWindow(state, 1000 + PUNCH_TAG_REFINE_WINDOW_MS + 1);
  assert(state.refineWindow === null, 'window expired');
  r = nextPunchTagState(state, 'KeyU', 1000 + PUNCH_TAG_REFINE_WINDOW_MS + 10);
  assert(r.action.kind === 'hint', 'letter after window hints Press P first');
}

console.log('4. P while window open starts a new tag');
{
  let state = createInitialPunchTagState();
  let r = nextPunchTagState(state, 'KeyP', 1000, 'tag-a');
  state = r.state;
  r = nextPunchTagState(state, 'KeyP', 1100, 'tag-b');
  assert(r.action.kind === 'create', 'second P creates');
  assert(r.state.refineWindow?.tagId === 'tag-b', 'window moves to new tag');
}

console.log('5. Backspace undoes');
{
  let state = createInitialPunchTagState();
  let r = nextPunchTagState(state, 'KeyP', 1000, 'tag-5');
  state = r.state;
  r = nextPunchTagState(state, 'Backspace', 1100);
  assert(r.action.kind === 'undo', 'Backspace is undo');
  assert(r.state.refineWindow === null, 'window cleared');
}

console.log('6. Letter with no P is a hint');
{
  const state = createInitialPunchTagState();
  const r = nextPunchTagState(state, 'KeyJ', 1000);
  assert(r.action.kind === 'hint', 'J alone hints Press P first');
}

console.log('7. Unknown key is ignore');
{
  const state = createInitialPunchTagState();
  const r = nextPunchTagState(state, 'KeyX', 1000);
  assert(r.action.kind === 'ignore', 'KeyX ignored');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
