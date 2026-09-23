# Punch Tagging Mode — Design

**Date:** 2026-09-23
**Status:** Approved in brainstorming, pending spec review

## Goal

Let labelers tag punches quickly with the keyboard while a round plays, so the client's model can do the detailed labeling afterwards. From the client:

> "The guys can type or tap P when a punch occurs, and after P they can put U for uppercut, O for overhead… I just need to tag the punches and then I'll send a model and do all the label."

"Overhead" maps to the existing punch type **Overhand**.

## Scope

In scope:

- A new **Punch Tag** assignment type, alongside the existing Offense full-labeling flow.
- A minimal tagging panel in the workspace, driven by P plus a type key.
- Punch Tag assignments flow through the existing save, submit, QC, and CSV export paths.

Out of scope:

- Any change to how Offense (full labeling) assignments behave.
- Changes to the external API contract or submit flow beyond what tags need.
- Model integration. The client pulls tags from the existing outputs.

A single round may have both an Offense assignment and a Punch Tag assignment, possibly held by different labelers.

## Decisions

| Topic | Decision |
|-------|----------|
| Architecture | New `LabelType` value `PUNCH_TAG`; tags stored as `Event` rows |
| What a tag captures | Timestamp (auto), camera (auto), labeler (auto), punch type |
| Bare `P` | A generic `Punch` tag: a punch happened, and the model decides the type |
| Type keys | `J` Jab, `C` Cross, `H` Hook, `U` Uppercut, `O` Overhand, `S` Screwshot |
| Refine window | 1.5 s after `P`; letters outside the window are ignored |
| Undo | `Backspace` removes the most recent tag |
| Submit | Same as today: save to DB, then send to the external API |
| Exports | Existing admin CSVs, which already have a label-type column |

## 1. Data and assignments

### Schema

- Add `PUNCH_TAG` to `enum LabelType` in `prisma/schema.prisma`, with a migration (`ALTER TYPE "LabelType" ADD VALUE 'PUNCH_TAG'`).
- No new columns. A tag is an `Event` row:

| Field | Value for a tag |
|-------|-----------------|
| `punchType` | `Punch` or one of `Jab`, `Cross`, `Hook`, `Uppercut`, `Overhand`, `Screwshot` |
| `startTime`, `endTime` | Both equal the video time when `P` was pressed (`MM:SS.cc`) |
| `cam` | Active camera at the moment `P` was pressed |
| `labeledBy`, `labeledByEmail` | Current user, as today |
| `boxer`, `hand`, `target`, `punchQuality` | `''` (left blank for the model) |
| `visibilityFlags` | `[]` |
| `knockdown` | `false` |
| `punchResult`, `defenseType`, `stance`, `landed` | `null` |
| `flagged` | `false` |

### Shared constants

In `src/lib/event-helpers.ts`, next to `PUNCH_RESULTS`:

- `PUNCH_TAG_TYPES = ['Punch', 'Jab', 'Cross', 'Hook', 'Uppercut', 'Overhand', 'Screwshot'] as const`
- `PUNCH_TAG_KEY_MAP` mapping `KeyJ`, `KeyC`, `KeyH`, `KeyU`, `KeyO`, `KeyS` to their punch types
- `PUNCH_TAG_REFINE_WINDOW_MS = 1500`

### Assignments

- `AssignmentModal.tsx`: add a "Punch Tag" option (`PUNCH_TAG`).
- `/api/videos/[id]/assign`: already accepts `labelType`, so no change is expected. Verify during implementation.

### Removing the Offense-only defaults

Several routes default to `OFFENSE`. Each needs to accept Punch Tag without changing Offense behavior:

| Location | Today | Change |
|----------|-------|--------|
| `workspace/page.tsx` `fetchAssignment` | Calls `/api/videos/{id}/assignment` with no `labelType`, so it always gets Offense | Read `labelType` from the URL (`?labelType=PUNCH_TAG`) and pass it through; default stays `OFFENSE` |
| `/api/videos` (dashboard list) | `assignments.where.labelType = 'OFFENSE'` | Include `PUNCH_TAG` and return `labelType` on each assignment |
| Workspace links in `VideoGrid.tsx`, `VideoCard.tsx`, `Sidebar.tsx` | Open `/workspace?videoId=…` | Show a "Punch Tag" badge; tag assignments link with `&labelType=PUNCH_TAG` |
| Workspace local cache (`workspace_events_${videoId}`, `workspace_recording_${videoId}`) | Keyed by video only | Punch Tag uses `…_${videoId}_PUNCH_TAG`, so it never collides with an Offense draft on the same round. Offense keys are unchanged, so existing drafts survive. |
| `/api/videos/[id]/status` | Falls back to `{ videoId, labelType: 'OFFENSE' }` | Callers in the workspace pass `assignmentId`; the fallback stays |
| `/api/videos/submitted` (QC queue) | `labelType: 'OFFENSE'` | Include `PUNCH_TAG` and return `labelType` so QC opens the right workspace |

### Validation

In `POST /api/videos/[id]/events`: if the assignment's `labelType` is `PUNCH_TAG`, every event's `punchType` must be in `PUNCH_TAG_TYPES`. Return a 400 error naming the offending value, using the same pattern as the `punchResult` check.

## 2. Tagging UI and hotkeys

### Components

- **`src/components/workspace/PunchTagPanel.tsx`** (new): rendered in place of `SidebarControls` when `assignment.labelType === 'PUNCH_TAG'`. It shows:
  - A key legend: `P` Punch, then `J C H U O S`.
  - The latest tag (time, camera, type), with a countdown bar while the refine window is open.
  - A running tag count.
  - "Start recording to tag" when Recording is off, and a read-only notice when the assignment is read-only.
- **`src/lib/punch-tag/punch-tag-state.ts`** (new): a pure reducer, `nextPunchTagState(state, key, now)`, that returns the next state plus the action to apply (`create`, `refine`, `undo`, `ignore`, or `hint`). It has no React or DOM dependencies, so it can be tested.
- **`src/lib/hooks/usePunchTagHotkeys.ts`** (new): a `window` keydown listener that applies the guards below, calls the reducer, and calls the page callbacks `onCreateTag(type)`, `onRefineTag(id, type)`, and `onUndoTag(id)`.

### Key behavior

| Situation | Result |
|-----------|--------|
| `P` | Create a `Punch` tag at `getCurrentTime()` on `activeCam`, and open the refine window for it. Playback continues. |
| Type key within 1.5 s of `P` | Set that tag's `punchType` and close the window |
| Type key with no open window | Ignored; brief "Press P first" hint |
| `P` while a window is open | Create a new tag and move the window to it; the previous tag keeps its type |
| `Backspace` | Remove the most recent tag created in this session |

The timestamp is captured when `P` is pressed, so the delay before the type key never shifts it.

### Guards

These apply to both the new hook and the existing `VideoPlayer` handler:

- Skip when focus is in `input`, `textarea`, `select`, or a `contentEditable` element. This goes in a shared helper, `isTypingTarget(el)`, in `src/lib/keyboard.ts`. It also fixes the existing case where Space and the arrow keys fire while a dropdown is focused.
- Match on `e.code` (`KeyP`, etc.), so Caps Lock and layout case don't matter.
- Ignore `e.repeat`, so holding `P` doesn't produce a burst of tags.
- Ignore events with `metaKey`, `ctrlKey`, or `altKey`, so browser and OS shortcuts still work.
- Do nothing unless the workspace is editable: Recording is on and the assignment is not read-only, the same rule as the full form. QC mode follows its existing edit rules.

Existing shortcuts (Space, ArrowLeft, ArrowRight) keep working unchanged.

### Page integration (`workspace/page.tsx`)

- Branch on `assignment?.labelType === 'PUNCH_TAG'` to render `PunchTagPanel` in place of `SidebarControls`.
- Tag callbacks reuse the existing `events` state and `generateId()`, so Save Progress and restore-on-refresh (local cache) behave as they do today.
- `EventLog` shows tags as time plus a type chip. Click-to-seek and delete work as today.

## 3. Submit, exports, and QC

### Submit

`handleSubmit` is unchanged in flow: save to the DB, then send the same `{ fight_title, RD{n}: { CamN: [...] }, submittedBy, isQCReview, reviewedBy }` payload to the external API. Tag events go through `transformEventForExternalAPI` with one tag-specific adjustment:

- `fighter` is `null` for tag events. The current logic maps any `boxer` that isn't boxer1 to `'boxer2'`, which would wrongly label every tag as boxer2. Offense events are unaffected.

Every other field passes through with the tag values from section 1.

### Exports

- `/api/admin/export-events` and `/api/admin/export-events/round` already output the label type (`assignmentLabelType` and `labelType` respectively). Verify that blank tag fields come out as empty cells, with no errors.
- No new export endpoints.

### QC

A QC reviewer opens a Punch Tag assignment from the queue and gets `PunchTagPanel` with the same keys, subject to QC's existing edit permissions. They approve through the existing status flow.

## Error handling

- Save rejected by validation: show the existing save-error UI with the server's message, which names the bad `punchType`.
- A hotkey pressed while the video isn't loaded: `getCurrentTime()` returns `00:00.00` today. The hook skips tag creation when no video element is ready, so zero-time tags aren't created.
- Refresh mid-session: tags survive through the existing local cache of unsaved events, under the Punch Tag cache key.

## Testing

The project has no test runner, so testing follows the repo's `scripts/verify-*.ts` convention:

- **`scripts/verify-punch-tag-state.ts`**: runs the reducer through these sequences:
  - P alone
  - P then U
  - P, a letter after the window closes
  - P, P, then O
  - Backspace
  - Held P (repeat)
  - A letter with no P
- **Manual browser pass:**
  1. Assign a Punch Tag round.
  2. Open it from the dashboard.
  3. Tag while the video plays.
  4. Switch cameras mid-session and confirm each tag's camera.
  5. Undo a tag.
  6. Save, refresh, and confirm the tags persist.
  7. Submit and inspect the external payload in the console.
  8. Export the round CSV.
  9. Open the round in QC.
  10. Confirm an Offense assignment on the same round, held by the same user, is unaffected, including its unsaved local draft.
- `npm run lint` and `npm run build` pass.

## Files touched (expected)

| File | Change |
|------|--------|
| `prisma/schema.prisma`, new migration | Add `PUNCH_TAG` |
| `src/lib/event-helpers.ts` | Tag constants |
| `src/lib/keyboard.ts` (new) | `isTypingTarget` |
| `src/lib/punch-tag/punch-tag-state.ts` (new) | Pure key-sequence reducer |
| `src/lib/hooks/usePunchTagHotkeys.ts` (new) | Hotkey hook |
| `src/components/workspace/PunchTagPanel.tsx` (new) | Tagging panel |
| `src/components/workspace/VideoPlayer.tsx` | Use `isTypingTarget` |
| `src/components/workspace/EventLog.tsx` | Tag display |
| `src/app/workspace/page.tsx` | `labelType` from URL, panel branch, tag callbacks, `fighter: null` for tags |
| `src/components/AssignmentModal.tsx` | Punch Tag option |
| `src/app/api/videos/route.ts` | Include `PUNCH_TAG` assignments |
| `src/app/api/videos/submitted/route.ts` | Include `PUNCH_TAG` in the QC queue |
| `src/app/api/videos/[id]/events/route.ts` | Tag type validation |
| `src/components/VideoGrid.tsx`, `VideoCard.tsx`, `Sidebar.tsx` | Badge and `labelType` link |
| `scripts/verify-punch-tag-state.ts` (new) | Reducer checks |

`workspace/page.tsx` is already over 1,200 lines. Tag logic lives in the new hook and panel, so the page gains only a render branch and three small callbacks.
