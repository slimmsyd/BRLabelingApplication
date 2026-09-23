# Handoff: Dashboard rework — filter bar, group-by-event queue, de-duped cards

## Overview
This handoff covers three improvements to the main dashboard (the "Explore Projects"
screen rendered by `my-app/src/components/VideoGrid.tsx`, with cards from
`my-app/src/components/VideoCard.tsx`). All three came out of a design review of the live
screen and were prototyped and approved before this handoff.

1. **Filter bar (center)** — adds an **Assignee** facet above the project grid so a manager
   can answer "what is *Vedz Ezel* working on?" in one click, plus a live project count.
2. **Group-by-event queue (right rail)** — the "In Queue" list currently repeats the same
   matchup once per round (e.g. *Sebastian Fundora v Keith Thurman* shown 8–11 times). This
   groups the queue **by event/matchup** into collapsible cards with an **Assign all** action,
   and keeps a toggle back to the original flat list.
3. **De-duplicated cards** — each project card showed the matchup twice (title **and**
   subtitle) and split assignment into two stacked pills. This collapses the redundancy into
   one calm row.

**The Upload Video button is intentionally unchanged** — per review it reads well as-is.

## About the design files
`BR Labs Dashboard.html` (with `dash-data.jsx`, `dash-components.jsx`, `dash-app.jsx`,
`tweaks-panel.jsx`) is an **interactive design reference** — a React + inline-Babel prototype
that recreates the dashboard with the three changes wired to a Tweaks panel (top-right):
`Queue display: grouped/flat`, `Show filter bar`, `De-duplicated cards`. Open it in a browser
to feel each change on/off.

It is **not** the code to ship. The code to ship is the change to the two real components,
already written for you as drop-in files (see **Files**). The prototype uses seed data and a
simplified left sidebar; ignore those — only the center grid + right rail behaviors are the
spec.

## Fidelity
**High-fidelity.** The drop-ins reuse the existing markup, Tailwind theme classes, and data
model verbatim; only the specified regions change. The result is pixel-faithful to today,
minus the removed redundancy.

## Data model (unchanged — important context)
`VideoGrid` fetches `/api/videos`, then splits the active (non-submitted) videos:
- **`assignedVideos`** → rendered as `VideoCard`s in the **center** ("Explore Projects").
- **`unassignedVideos`** → rendered in the **right rail** ("In Queue").
Submitted/Reviewed/Completed videos are filtered out of this screen entirely (they live in
the left sidebar lists). The three changes below respect this split — the filter scopes the
center, the grouping restructures the rail.

---

## Change 1 — Filter bar (center)
**File:** `VideoGrid.tsx`. **What & why:** the center grid has no filtering today; the only
way to find a person's work is to scan every card. Add an **Assignee** facet.

- New state: `assigneeFilter` (string | null) and `assigneeMenuOpen` (bool).
- `assigneeOptions` is derived from the assignees actually present on `assignedVideos`
  (`username` or the email local-part), de-duplicated and sorted — so the dropdown only ever
  lists real, relevant people.
- `filteredAssignedVideos` applies the facet; the grid maps over this instead of
  `assignedVideos`. A live `"N projects"` count sits at the right of the bar.
- The bar uses a `SlidersHorizontal` icon + a bordered dropdown button; the active state
  borders with `accent-primary`. Empty result shows "No projects match this filter."

> **Scope note for the implementer:** the facet currently scopes only the center grid (the
> explicit ask was "filter who/what is assigned to who"). The left sidebar lists are a separate
> component and are *not* affected. If you later want the facet to scope the whole screen,
> lift `assigneeFilter` to a shared context — flagged as a future option, not built here.

> I kept the bar to a single **Assignee** control on purpose: because the center only ever
> shows active *assigned* videos (unassigned ones are in the queue, submitted ones are gone),
> status segments would be nearly always "In Progress" and add noise. If you want a status
> filter later, the natural place is once submitted videos are surfaced here.

## Change 2 — Group-by-event queue (right rail)
**File:** `VideoGrid.tsx`. **What & why:** the queue lists one row per round, so a single
fight floods the rail with near-identical rows. Group by matchup.

- New state: `groupQueue` (bool, **default `true`**) and `collapsedGroups`
  (`Record<eventKey, boolean>`).
- `queueGroupsObj` groups `unassignedVideos` by `` `${boxer1} vs ${boxer2}` ``; rounds are
  sorted ascending within each event.
- A **toggle** next to the "In Queue" count flips grouped ⇄ flat (shows "N events" when
  grouped, "Group" when flat) — so the **original flat list is always one click away**.
- **Grouped card:** a header (chevron + event title + "N rounds awaiting pickup" + count
  badge) that collapses/expands.
  - *Collapsed* → a compact strip of round chips (`R1 R2 R3 …`).
  - *Expanded* → the full per-round queue cards (the **exact original row markup**, including
    the `ASSIGN` button and admin delete menu), plus an **"Assign all N rounds"** button.
- The per-round row markup was extracted into a single `renderQueueCard(video)` helper and is
  reused by **both** grouped and flat modes — so nothing about the individual row changed.

> **One implementation TODO is marked in code:** the "Assign all" button currently opens the
> existing `AssignmentModal` for the **first** round of the event (safe, non-breaking). If you
> want true batch assignment, extend `AssignmentModal` to accept an array of video/round ids
> and pass `list.map(v => v.id)` — see the `TODO(impl)` comment in `VideoGrid.tsx`.

## Change 3 — De-duplicated cards
**File:** `VideoCard.tsx`. **What & why:** each card showed the matchup as both the title and
a subtitle, and split assignment into a white "ASSIGNED: name" pill stacked above a separate
status pill — three redundant elements.

- **Removed** the `{boxer1} vs {boxer2}` subtitle `<p>` (the title already contains the
  matchup, e.g. *"Isaac Cruz v Giovanni Cabrera - R11"*).
- **Merged** the assignment display into **one inline row**: a small green dot + assignee name
  + the status pill side-by-side. The status pill keeps the **exact existing color logic**
  (`SUBMITTED` = yellow, `COMPLETED` = green, else blue) and the `ASSIGNED → IN PROGRESS`
  relabel. The old heavy white pill is gone.
- The `UNASSIGNED` state is unchanged.

---

## Screens / Views

### Explore Projects (center column)
- **Purpose:** browse active *assigned* work; filter by assignee.
- **Layout:** `flex-1`, heading + **filter bar**, then `grid grid-cols-1 sm:grid-cols-2 gap-6`
  of `VideoCard`s (now de-duped). Empty-filter state shows a centered message.

### In Queue (right rail, `w-80`)
- **Purpose:** unassigned footage awaiting pickup; assign it out.
- **Layout:** Upload Video button (unchanged) → "In Queue" header with count + **group toggle**
  → either grouped event cards or the flat list → helper caption.

## Components
- **Filter bar** *(new)* — icon + Assignee dropdown (border turns `accent-primary` when
  active) + right-aligned count. Tokens only; no new colors.
- **Queue group card** *(new)* — `bg-surface/50 border border-border rounded-xl`; header
  button; collapsed chip strip / expanded rows; amber count badge to match the existing
  "AWAITING PICKUP" amber.
- **VideoCard** *(modified footer)* — see Change 3.
- **Queue row** *(unchanged markup)* — now produced by `renderQueueCard()`.

## Interactions & Behavior
- **Assignee facet:** click → dropdown of real assignees → selecting filters the grid + count;
  "Anyone" clears. (`assigneeMenuOpen` toggles the menu.)
- **Group toggle:** flips `groupQueue`; grouped is default.
- **Group header click:** toggles `collapsedGroups[event]` (collapsed = chips, expanded = rows).
- **Assign / Assign all / delete / reassign / remove:** all use the existing
  `AssignmentModal`, `/api/videos/:id` delete, and `/unassign` flows — **unchanged**.
- **Permissions:** `canAssignRounds(currentUser?.email)` still gates ASSIGN buttons; admin
  still gates the delete menu — **unchanged**.

## State Management
Existing: `videos, loading, error, currentUser, assignModalOpen, openDropdownId,
deleteConfirmId, deleting, selectedVideoForAssign`.
**Added:** `assigneeFilter, assigneeMenuOpen` (filter bar) and `groupQueue, collapsedGroups`
(queue). All client-only UI state — no API or schema changes.

## Design Tokens (existing — none added)
Reuses `bg-surface`, `bg-surface-hover`, `border-border`, `text-foreground`,
`text-foreground-secondary`, `text-foreground-tertiary`, `bg-accent-primary` /
`accent-primary`, and the status hues `amber-500`, `blue-500`, `green-500`, `yellow-500`
(at `/10` bg, `/20`–`/30` border). Layout via the Tailwind scale (`gap`, `p-3`, `rounded-xl`,
`rounded-full`, `space-y-*`).

## Assets
None added. New icons are existing `lucide-react` imports added to `VideoGrid.tsx`:
`SlidersHorizontal, ChevronDown, ChevronRight, Layers` (alongside the existing `Plus, Loader2,
UserPlus, MoreVertical, Trash2`).

## Files
- `VideoGrid.tsx` — **drop-in replacement** for `my-app/src/components/VideoGrid.tsx`. All
  additions are marked with `// ── ADDED:` / `CHANGED:` comments; the assign/delete/modal
  logic is byte-for-byte the same behavior.
- `VideoCard.tsx` — **drop-in replacement** for `my-app/src/components/VideoCard.tsx`. Only the
  content footer changed (marked `CHANGED:`).
- `BR Labs Dashboard.html` + `dash-data.jsx` + `dash-components.jsx` + `dash-app.jsx` +
  `tweaks-panel.jsx` — interactive design reference. Open the HTML in a browser; use the Tweaks
  panel to compare each change on/off.

## Notes for the implementer
- Both `.tsx` files are drop-in; review the marked regions if you'd rather hand-apply.
- The only real follow-up decision is **batch "Assign all"** (see the `TODO(impl)` in
  `VideoGrid.tsx`) — wire it to `AssignmentModal` if/when it supports multiple ids.
- `groupQueue` defaults to grouped. If you'd rather ship flat-by-default and let users opt in,
  change the `useState(true)` to `useState(false)`.
- The grouping key is the literal `` `${boxer1} vs ${boxer2}` `` string; if you have a real
  `eventId`/`fightId` on the video, prefer grouping on that for correctness.
