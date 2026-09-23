# Handoff: Sidebar navigation — fill wasted space + clearer sections

## Overview
The left navigation sidebar in the BR Labeling app (`my-app/src/components/Sidebar.tsx`)
has two long lists — **Awaiting QC** and **QC Complete** — that are each hard-capped at
`max-h-40` (160px). With hundreds of items per list (e.g. ~181 awaiting, ~486 complete),
reviewers can only see ~2 rows at a time and must scroll a tiny window to find anything,
while the entire **lower half of the sidebar sits empty**.

This handoff makes one surgical change: **let the two lists grow to fill the full sidebar
height**, each scrolling inside its own region, and adds a thin top divider above each
section so the three groups (Assigned to You / Awaiting QC / QC Complete) read as clearly
distinct. No colors, fonts, row markup, badges, search, collapse, or resize behavior
change — only the layout containers.

This is intentionally minimal: the goal was "make the list longer / use the whitespace and
make sections clearer **without changing too much.**"

## About the design files
The HTML file in this bundle (`BR Labs Sidebar.html`) is a **design reference** — a React +
inline-Babel prototype that recreates the sidebar to demonstrate the intended look and
behavior. It is **not** the code to ship. The thing to ship is the change to the real
component, which is already written for you as a drop-in file (see **Files** below).

The prototype also contains a Tweaks panel that explored several options. **The settled,
approved configuration is:**
- **Section style: `plain`** — keep the existing tertiary-gray uppercase headers, separate
  sections with a 1px top divider (no colored/tinted header backgrounds).
- **List balance: `equal`** — both lists get an equal share of the available height
  (`flex-1` each).
- **Density: `comfortable`** — existing row padding (`px-3 py-2`), unchanged.

The other Tweak options (tinted/rail headers, weighted balance, compact density, hide editor)
were rejected and should be ignored.

## Fidelity
**High-fidelity.** The prototype matches the production theme exactly (`#121212` sidebar,
Geist font, the existing badge/row styling). Because the real change reuses the existing
component's markup verbatim and only edits container classes, the result will be
pixel-faithful to today's rows — just taller, fuller, and divider-separated.

## The change (this is the whole thing)
All edits are in `my-app/src/components/Sidebar.tsx`. Three structural class changes:

### 1. `<nav>` becomes a height-owning flex column
The nav used to be a single scroll container (`space-y-6 overflow-y-auto`). Make it a flex
column that owns the remaining height and lets children shrink (`min-h-0`), so each list can
scroll independently instead of the whole nav scrolling as one.

```diff
- <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto overflow-x-hidden custom-scrollbar">
+ <nav className="flex-1 min-h-0 px-4 py-6 flex flex-col gap-6 overflow-x-hidden">
```

### 2. "Assigned to You" stays its natural height
This section is short and should not stretch — pin it so the two big lists absorb the slack.

```diff
- <div className="space-y-2">            {/* Assigned to You wrapper */}
+ <div className="space-y-2 flex-shrink-0">
```

### 3. Both QC sections fill equally, scroll internally, and get a divider
Applies to **both** the *Awaiting QC* and *QC Complete* section wrappers (they are identical).

Outer wrapper — was a plain `<div className="space-y-2">`:
```diff
- <div className="space-y-2">
+ <div className={`space-y-2 ${isOpen ? 'flex-1 min-h-0 flex flex-col pt-6 border-t border-border' : ''}`}>
```
- `flex-1` → equal share of leftover height (this is the "equal balance" choice).
- `min-h-0 flex flex-col` → lets the inner list shrink and scroll.
- `pt-6 border-t border-border` → the thin separator that makes sections distinct ("plain" style).
- Gated on `isOpen` so the collapsed 80px rail doesn't show empty bordered boxes.

Inner list — **remove the 160px cap**, let it fill and scroll:
```diff
- <div className="space-y-0.5 max-h-40 overflow-y-auto">
+ <div className="space-y-0.5 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
```
(`custom-scrollbar` reuses the existing thin-scrollbar style already defined in the component.)

That's all. The complete edited component is included as a drop-in file.

## Screens / Views

### Sidebar (expanded, `isOpen === true`)
- **Purpose:** Browse and open videos by workflow state; find older items by scrolling.
- **Layout:** Fixed left column, `h-screen`, user-resizable width 200–500px (default 256px),
  `bg-sidebar-bg`, `border-r border-border`. Vertical flex:
  1. **Header** — fixed `h-16`: hamburger toggle + pill search input.
  2. **Nav** — `flex-1 min-h-0`, flex column, `gap-6`, `px-4 py-6`:
     - *Assigned to You* — natural height (`flex-shrink-0`).
     - *Awaiting QC* — `flex-1` (equal share), top divider, internal scroll.
     - *QC Complete* — `flex-1` (equal share), top divider, internal scroll.
  3. **Footer** — fixed: Settings link + "Box RAW Labs" wordmark, `border-t`.
- **Result:** the two lists divide the leftover vertical space evenly; each scrolls its own
  hundreds of rows; no empty gap remains at the bottom.

### Sidebar (collapsed, `isOpen === false`)
- Width animates to 80px; section headers and list rows hide; the flex/divider classes are
  gated off (`isOpen ? ... : ''`) so nothing empty renders. **Unchanged behavior.**

## Components (all unchanged from current production)
- **Section header:** `text-xs font-semibold text-foreground-tertiary uppercase tracking-wider`,
  `px-2`. QC headers also show a count pill.
- **Count pill:** `px-1.5 py-0.5 text-[9px] font-bold rounded border`, tinted per section
  (amber for Awaiting QC, green for QC Complete).
- **List row (`Link`):** `flex flex-col gap-1.5 px-3 py-2 rounded-lg`, `hover:bg-white/5`.
  - Line 1: `Video` icon (14px) + title (`text-xs font-medium truncate`). Icon color:
    amber (awaiting), green (completed) or purple (reviewed).
  - Line 2 (`pl-5 flex-wrap`): status pill (NEEDS QC / REVIEWED / COMPLETED), round pill
    `R{n}` (blue), optional username, and date (`text-[9px] text-foreground-tertiary`).
- **Empty / loading states:** italic muted text / spinner — unchanged.

## Interactions & Behavior (all unchanged)
- **Search:** filters all three lists by title, boxer names, round, and username (live).
- **Row click:** `Link` → `/workspace?videoId={id}`.
- **Collapse toggle / drag-resize (200–500px):** unchanged.
- **Scrolling:** each QC list now scrolls within its own region instead of one combined nav
  scroll. Thin custom scrollbar (`custom-scrollbar`).
- **Hover:** rows `hover:bg-white/5`. No new animations.

## State Management (unchanged)
`user`, `assignments`, `submittedVideos`, `loading`, `submittedLoading`, `searchQuery`,
`sidebarWidth`, `isResizing`. Data still comes from `/api/auth/me`,
`/api/videos/assigned?userId=…`, and `/api/videos/submitted`. Awaiting QC = items with
status `SUBMITTED`; QC Complete = status `REVIEWED` or `COMPLETED`.

## Design Tokens (existing — do not introduce new ones)
The change adds **no** new tokens. It reuses existing Tailwind theme classes already in the
codebase:
- `bg-sidebar-bg` (`#121212`), `border-border` (zinc-800 `#27272a`), `text-foreground`,
  `text-foreground-secondary`, `text-foreground-tertiary`, `bg-surface`, `bg-surface-hover`,
  `text-accent-primary`.
- Status hues: `amber-500`, `blue-400/500`, `green-500`, `purple-500` (at `/10` bg, `/20` border).
- Spacing/radii via Tailwind scale: `gap-6`, `px-4 py-6`, `px-3 py-2`, `pt-6`, `rounded-lg`.
- Layout primitives added: `min-h-0`, `flex-1`, `flex-shrink-0`, `flex flex-col`,
  `border-t`, `overflow-y-auto`, `custom-scrollbar`.

## Assets
None added. Icons are existing `lucide-react` imports (`Video`, `Search`, `Settings`,
`Loader2`).

## Files
- `Sidebar.tsx` — **drop-in replacement** for `my-app/src/components/Sidebar.tsx`. The only
  differences from current production are the three container-class changes above (marked
  with `CHANGED:` comments in the file). Apply by replacing the file, or hand-apply the three
  diffs.
- `BR Labs Sidebar.html` — interactive design reference (open in a browser). Includes a Tweaks
  panel; the approved config is **plain + equal + comfortable**.

## Notes for the implementer
- This is a layout-only change; no API, data-shape, or styling-token changes are required.
- If you want the divider only *between* the two QC sections (not above the first one), drop
  `border-t border-border` from the *Awaiting QC* wrapper and keep it on *QC Complete*. As
  written, both carry it, which also separates Awaiting QC from "Assigned to You" above it.
- The collapsed-rail behavior is preserved by gating the flex/divider classes on `isOpen`.
  Verify the 80px collapsed state still looks correct after applying.
