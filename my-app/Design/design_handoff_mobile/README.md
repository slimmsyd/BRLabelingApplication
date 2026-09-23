# Handoff: Responsive mobile layout — "Drawer" navigation (web app)

## Overview
Makes the existing **web** dashboard responsive down to phone widths using the **drawer**
navigation pattern. This is **not** a native app and **not** a new route — it's Tailwind
responsive classes on the components you already ship, plus two small new components
(`MobileTopBar`, optional `UploadFab`).

The single breakpoint is Tailwind's **`lg` (1024px)**:
- **≥ lg (desktop):** everything looks and behaves exactly as today — fixed left Sidebar,
  `ml-64/ml-20` content offset, 3-column feel. **Nothing changes.**
- **< lg (tablet/phone):** the Sidebar becomes an **off-canvas drawer** opened by a hamburger
  in a new mobile top bar; the content goes full-width and single-column; the
  center "Explore Projects" grid stays **two-up**; the right rail (Upload + In Queue +
  Feedback) **stacks below** the projects.

## About the design files
`BR Labs Mobile.html` (+ `mobile-app.jsx`, `ios-frame.jsx`, `dash-data.jsx`, `feedback-ui.jsx`,
`tweaks-panel.jsx`) is the **interactive design reference** — a React prototype shown in an
iPhone frame. Its Tweaks panel toggles `tabs` vs `drawer`; **this handoff implements the
`drawer` direction.** The prototype is reference only; ship the real component changes below.

> The prototype shows a phone-native "Account" tab and bottom-bar variant for completeness —
> ignore those. On the **web** app the drawer reuses your existing `Sidebar` content (Assigned
> to You / Awaiting QC / QC Complete / Settings), so there's no separate "Review"/"Account"
> screen to build. The drawer **is** the mobile home for those lists.

## Fidelity
**High-fidelity, production-ready.** New components use your existing theme tokens and
`lucide-react`. The rest is responsive utility classes on current markup — no logic, API, or
data-model changes.

## Files in this package
1. **`page.tsx`** — drop-in replacement for `my-app/src/app/page.tsx`. Adds mobile drawer state,
   a backdrop, the mobile top bar, and responsive `<main>` margins/padding.
2. **`MobileTopBar.tsx`** → `my-app/src/components/MobileTopBar.tsx` (new). Hamburger + brand,
   `lg:hidden`, sticky.
3. **`UploadFab.tsx`** → `my-app/src/components/UploadFab.tsx` (new, **optional**). Floating "+"
   on mobile so upload is reachable without scrolling. Mount it once (e.g. in `page.tsx` inside
   `<main>`); skip it if you'd rather rely on the rail's Upload button stacked below.
4. Reference prototype files (open `BR Labs Mobile.html`).

The two big existing components — `Sidebar.tsx` and `VideoGrid.tsx` / `VideoCard.tsx` — are
**not** reprinted here (they're large and you already have them). Apply the surgical class
diffs below.

---

## Change A — `page.tsx` (provided as a full drop-in)
- New `mobileNavOpen` state (separate from the desktop `isSidebarOpen` collapse).
- A **backdrop** div (`lg:hidden`, fades in when the drawer is open, click to close).
- `<MobileTopBar onMenu={() => setMobileNavOpen(true)} />` rendered inside `<main>` (hidden on
  desktop).
- `<main>` margins are now responsive: `p-4 ml-0` on mobile, `lg:p-8 lg:ml-64 / lg:ml-20` on
  desktop. (Was unconditional `p-8` + `ml-64/ml-20`.)
- Passes `mobileOpen` + `onMobileClose` into `<Sidebar>`.
- An effect closes the drawer when the viewport crosses back to ≥ lg.

## Change B — `Sidebar.tsx` (apply these diffs)
The Sidebar is `fixed left-0 top-0 z-50` already. Make it a drawer on mobile.

**1) Extend the props** (top of file):
```diff
  interface SidebarProps {
      isOpen: boolean;
      toggle: () => void;
+     mobileOpen?: boolean;       // drawer open on < lg
+     onMobileClose?: () => void; // close the drawer
  }
- const Sidebar = ({ isOpen, toggle }: SidebarProps) => {
+ const Sidebar = ({ isOpen, toggle, mobileOpen = false, onMobileClose }: SidebarProps) => {
```

**2) The root `<aside>`** — force full drawer width + slide on mobile, keep desktop as-is:
```diff
  <aside
      style={{ width: isOpen ? `${sidebarWidth}px` : '80px' }}
-     className={`h-screen bg-sidebar-bg border-r border-border flex flex-col fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out ${isResizing ? 'select-none' : ''}`}
+     className={`h-screen bg-sidebar-bg border-r border-border flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out
+         max-lg:!w-[86vw] max-lg:!max-w-[330px] max-lg:shadow-2xl max-lg:shadow-black/50
+         lg:translate-x-0 ${mobileOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full'}
+         ${isResizing ? 'select-none' : ''}`}
  >
```
- `max-lg:!w-[86vw] max-lg:!max-w-[330px]` use Tailwind `!important` so they override the inline
  `width` on mobile (inline style otherwise wins). On desktop the inline width rules again.
- `lg:translate-x-0` keeps it pinned on desktop; on mobile it slides via `mobileOpen`.

**3) Add a close (X) button** in the existing header row (the `h-16` flex container), visible
only on mobile so users can dismiss the drawer:
```diff
  <div className={`h-16 flex items-center px-4 gap-3 ${!isOpen && 'justify-center'}`}>
      <button onClick={toggle} className="...hamburger toggle (existing)...">…</button>
      {/* existing search input wrapper … */}
+     <button
+         onClick={onMobileClose}
+         aria-label="Close menu"
+         className="lg:hidden ml-1 w-9 h-9 flex items-center justify-center rounded-md text-foreground-secondary hover:bg-white/5"
+     >
+         {/* import { X } from 'lucide-react' */}
+         <X size={20} />
+     </button>
  </div>
```

**4) Mobile content is always expanded.** The desktop "collapsed 80px" state hides labels via
`!isOpen` classes. On mobile the drawer is full-width, so you want the expanded content. The
simplest guarantee: in `page.tsx`, `isSidebarOpen` defaults to `true` (it does), so the drawer
shows full content. If a user collapses on desktop then shrinks the window, pass an
already-true value or compute `const expanded = mobileOpen || isOpen;` and use `expanded` in
the label-visibility classes. Optional polish — not required for the common case.

> If you applied the earlier **sidebar handoff** (lists fill the height + dividers), keep it —
> these drawer changes are purely additive and compose with it.

## Change C — `VideoGrid.tsx` (apply these diffs)
Stack the two columns and tighten the grid on mobile.

```diff
- <div className="flex gap-8">
+ <div className="flex flex-col lg:flex-row gap-8">

      {/* Left column: Explore Projects */}
      <div className="flex-1 min-w-0">
          …
-         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
+         <div className="grid grid-cols-2 gap-4 lg:gap-6">   {/* two-up on phones */}
              … VideoCard …
          </div>
      </div>

      {/* Right column: In Queue */}
-     <div className="w-80 shrink-0 space-y-6">
+     <div className="w-full lg:w-80 shrink-0 space-y-6">     {/* full-width, stacks below */}
          … Upload + In Queue + <FeedbackWidget /> …
      </div>
  </div>
```
- The center filter bar (`flex items-center gap-3 ... flex-wrap`) already wraps; on very narrow
  screens consider `overflow-x-auto` on it so the segments scroll instead of wrapping.
- The grouped "In Queue" stays collapsible (from the dashboard handoff). On mobile this reads
  as a tidy stack under the cards — no extra work needed.

## Change D — `VideoCard.tsx` (apply these diffs)
The card is sized for desktop; make it breathe at two-up phone width.
```diff
- <div className="relative aspect-[4/3] bg-black/40 overflow-hidden p-4">
+ <div className="relative aspect-[4/3] bg-black/40 overflow-hidden p-2 lg:p-4">

- <div className="px-5 pb-5 pt-2 flex flex-col flex-1">
+ <div className="px-3 pb-3 pt-2 lg:px-5 lg:pb-5 flex flex-col flex-1">

- <h3 className="font-semibold text-foreground text-base mb-1 ... line-clamp-1">
+ <h3 className="font-semibold text-foreground text-sm lg:text-base mb-1 ... line-clamp-2 lg:line-clamp-1">
```
- `line-clamp-2` on mobile prevents long matchup titles from truncating to nothing at narrow
  width; the desktop stays single-line.
- The de-duped footer (name + status pill) already wraps; no change needed.

## Optional — `UploadFab.tsx`
Mount `<UploadFab />` once (e.g. just before `</main>` in `page.tsx`) so upload is one tap away
on mobile. It's `lg:hidden`. Skip it if you prefer the stacked rail Upload button.

---

## Screens / Views
- **Mobile dashboard (< lg):** sticky top bar (hamburger + brand) → "Explore Projects" heading
  + filter bar → **two-up** project cards → Upload + **In Queue** (grouped, collapsible) +
  **Feedback** stacked below → optional FAB.
- **Drawer (< lg, open):** the existing Sidebar slides in from the left over a dimmed backdrop:
  search, *Assigned to You*, *Awaiting QC* (count), *QC Complete* (count), Settings, brand.
  Close via the X, the backdrop, or selecting an item.
- **Desktop (≥ lg):** unchanged.

## Interactions & Behavior
- **Hamburger** (top bar) → opens drawer (`mobileNavOpen = true`).
- **Backdrop / X / nav item** → closes drawer.
- **Resize to ≥ lg** → drawer auto-closes (effect in `page.tsx`) so it can't get stuck.
- All existing behaviors (search, assign, group toggle, delete, feedback submit) are untouched.

## State Management
- New: `mobileNavOpen` in `page.tsx`; `mobileOpen` / `onMobileClose` props threaded into
  `Sidebar`. Everything else unchanged.

## Design Tokens (existing — none added)
`bg-background`, `bg-sidebar-bg`, `border-border`, `text-foreground` / `-secondary` /
`-tertiary`, `accent-primary`, `bg-white/5`. Only responsive variants (`lg:`, `max-lg:`) and a
couple of arbitrary values (`!w-[86vw]`, `max-w-[330px]`) are introduced.

## Assets
None. New icons: `Menu` (top bar), `X` (drawer close), `Plus` (FAB) — all `lucide-react`.

## Notes for the implementer
- **Test the crossover:** open the drawer on a phone width, then widen past 1024px — it should
  auto-close and the fixed desktop sidebar should take over with no fl... of an overlay.
- The `max-lg:!w-[...]` important utilities exist specifically to beat the inline `width` style
  on `<aside>`; don't remove the `!`.
- If your Tailwind config predates `max-*` variants (very old v3), replace
  `max-lg:foo` with a `lg:`-reset approach (apply mobile styles by default, override at `lg:`).
- HeroSection isn't included here; if it's tall, give it responsive padding/typography
  (`text-... lg:text-...`, `py-... lg:py-...`) so it doesn't dominate the first mobile screen.
