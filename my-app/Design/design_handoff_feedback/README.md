# Handoff: Anonymous Feedback widget (Direction B — expandable rail prompt)

## Overview
Adds a lightweight, **anonymous** feedback collector to the dashboard. It lives in the
**right-rail whitespace** below "In Queue" (the empty space when the queue is short) as a
single collapsed prompt — **"How are we doing?"** — that expands inline into a short form.
No new page, no route change, no layout shift to the rest of the dashboard.

This is **Direction B** of three that were prototyped; the team chose the expandable-prompt
placement because it keeps the rail tidy until someone actually wants to give feedback, while
staying always-available and passive.

## What it collects (one low-friction ask, all anonymous)
- **Category** chip — `General · Bug · Idea · Friction` (routes the input; covers bug reports,
  feature requests, task friction, and general sentiment in one control).
- **5-point experience rating** — the satisfaction signal, with a live `Rough → Great` label.
- **Optional comment** — placeholder text adapts to the chosen category
  (e.g. Bug → "What broke? Where did it happen?").
- An explicit **Anonymous** lock label so users trust it. **No user id, session, or email is
  read or sent** — see the endpoint.
- Submitting requires at least a rating **or** a comment, then shows a calm
  "Thanks — that helps. Sent anonymously." success state with **Send another**.

## About the design files
`BR Labs Feedback.html` (+ `feedback-ui.jsx`, `feedback-app.jsx`, `dash-*.jsx`,
`tweaks-panel.jsx`) is the **interactive design reference** — a React + inline-Babel prototype
showing the widget in the real dashboard. Its Tweaks panel (top-right) switches between
Directions A/B/C; **the shipped design is B**. The prototype is reference only — the code to
ship is the two files below.

## Fidelity
**High-fidelity, production-ready.** `FeedbackWidget.tsx` is a real Next.js client component
using your existing Tailwind theme tokens and `lucide-react` icons — it matches the prototype
1:1 and drops straight into the app.

## Files
1. **`FeedbackWidget.tsx`** → put at `my-app/src/components/FeedbackWidget.tsx`.
   Self-contained client component. Manages its own open/collapsed + form state and POSTs to
   `/api/feedback`. No props.
2. **`api-feedback-route.ts`** → put at `my-app/src/app/api/feedback/route.ts`.
   Example anonymous POST endpoint (validates input, stores nothing identifying). Includes a
   commented-out Prisma insert — wire it to your DB, or rely on the `console.log` to start.
3. Design reference: `BR Labs Feedback.html` + the `*.jsx` files (open in a browser).

## How to mount it (one line)
In `my-app/src/components/VideoGrid.tsx`, in the **right column** (the `w-80` rail), add the
widget right after the "In Queue" block — i.e. just after this existing caption:

```tsx
            <p className="text-xs text-foreground-secondary mt-4 text-center">
                Videos waiting to be picked up by team members
            </p>
        </div>   {/* end of the In Queue <div> */}

        {/* ── ADDED: anonymous feedback widget fills the rail whitespace ── */}
        <FeedbackWidget />
    </div>      {/* end of the right column (w-80) */}
```

And add the import at the top of `VideoGrid.tsx`:
```tsx
import FeedbackWidget from './FeedbackWidget';
```

That's the entire integration. The rail is already a `space-y-6` flex column, so the widget
inherits the correct spacing automatically.

> If you applied the earlier dashboard handoff (filter bar + grouped queue), the mount point is
> identical — the "In Queue" block ends with the same caption `<p>`; drop `<FeedbackWidget />`
> right after it, still inside the `w-80` column.

## Components
- **Collapsed prompt** *(always visible)* — `MessageSquare` icon tile + "How are we doing?" +
  sub-label + chevron. `bg-[#161616] border border-border rounded-2xl`; border turns
  `accent-primary/30` when open.
- **Category chips** — pill buttons; active state is color-coded per category
  (blue/red/amber/purple at `/10` bg, `/40` border) using **literal** Tailwind class strings
  (JIT-safe).
- **Rating** — 5 equal segments that fill with `accent-primary` cumulatively; hover previews;
  click again to clear.
- **Comment** — `textarea`, focus ring `accent-primary/50`.
- **Footer** — `Lock` + "Anonymous" on the left; `Send` button (disabled until rating or
  comment) on the right.
- **Success state** — green check, thank-you copy, "Send another".

## Interactions & Behavior
- **Header click** toggles expand/collapse (`open` state).
- **Category click** sets `cat` and swaps the textarea placeholder.
- **Rating** hover/click with clear-on-repeat.
- **Send** POSTs `{ category, rating, comment, path }` to `/api/feedback`, then shows the
  success state. It's optimistic — if the request fails it still thanks the user (and logs the
  error) so they're never blocked. Adjust if you'd rather surface failures.
- **Send another** resets the form in place.

## State Management
All local to the component: `open, cat, rating, hover, text, sent, submitting`. No global
state, context, or props. No effect on existing dashboard state.

## Backend / Data
- **Endpoint:** `POST /api/feedback` (example provided). Accepts only non-identifying fields,
  caps comment length, requires rating-or-comment.
- **Anonymity:** the client deliberately sends **no** user id/email/session; the route reads
  none. Keep it that way for honest feedback.
- **Suggested Prisma model** (optional — only if you want to persist):
  ```prisma
  model Feedback {
    id        String   @id @default(cuid())
    category  String   // 'general' | 'bug' | 'idea' | 'friction'
    rating    Int?     // 1–5, nullable
    comment   String?  @db.Text
    path      String?  // page it was sent from, e.g. "/" or "/workspace"
    createdAt DateTime @default(now())
  }
  ```
  Then uncomment the `prisma.feedback.create(...)` call in the route.

## Design Tokens (existing — none added)
`bg-surface`, `bg-surface-hover`, `border-border`, `text-foreground` / `-secondary` /
`-tertiary`, `accent-primary` (+ opacity variants used elsewhere in the app), and status hues
`blue-/red-/amber-/purple-/green-500`. One literal hex `#161616` for the card surface (matches
the prototype; swap to `bg-surface` if you prefer the token — it's a touch lighter).

## Assets
None. Icons are `lucide-react`: `MessageSquare, Lock, Send, Check, ChevronUp, ChevronDown`.

## Notes for the implementer
- The widget is presentation-complete; the only real wiring is the DB insert (1 uncomment) and,
  if you want, a small **admin view** to read submissions (`SELECT * FROM Feedback ORDER BY
  createdAt DESC`) so feedback doesn't vanish into a void.
- **Routing by category** (e.g. bugs → Slack/issue tracker, ideas → a board) can hang off the
  `category` field server-side in the route — a natural follow-up, not built here.
- If you later want it on **every** page (workspace, QC) rather than just the dashboard, the
  same component works as a global floating button (that was prototype "Direction C") — ask
  and I'll package that variant too.
