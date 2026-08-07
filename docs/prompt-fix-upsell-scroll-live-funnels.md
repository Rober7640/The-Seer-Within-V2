# PROMPT — roll the upsell scroll fix out to the live funnels

**How to use this:** open a fresh Claude Code session in this repo and say:

> Read `docs/prompt-fix-upsell-scroll-live-funnels.md` and do it.

Everything below is written for whoever picks this up, with no memory of the
conversation that found the bug. Written 2026-08-07.

⚠ **This changes what real buyers see on six live, revenue-earning pages.** It is
a small change, but it is not a no-op. Do not start it on a Friday afternoon and
do not deploy it without watching the numbers afterwards.

---

## The job in one sentence

Two upsell pages grow the browser page instead of scrolling their own message
list, which pushes new messages and every button below the fold; make them behave
like a proper chat window on all funnels, the way `/tarot/twin-flame/*` already
does.

## The bug, and how to see it for yourself

`client/src/pages/UpsellPage.tsx` and `client/src/pages/Upsell2Page.tsx` render:

```
<div className="min-h-screen … flex flex-col">      ← outer column
  <header … />
  <div className="flex-1 overflow-y-auto …">        ← message list
  <footer … />                                       ← quick replies / CTA / shipping form
```

A flex child defaults to `min-height: auto`, which stops it shrinking below its
content. So the message list never becomes scrollable — it just grows, the outer
`min-h-screen` column grows with it, and the whole **document** gets taller while
the window stays scrolled at 0. The `scrollRef` auto-scroll effect in both files
is therefore dead code: `scrollTo()` on a container whose `scrollHeight` equals
its `clientHeight` does nothing.

Measured on this branch at a 430×880 viewport, on `/welcome1?demo=true`:

```
container scrollHeight 1135 === clientHeight 1135    never scrollable
window.scrollY 0 · document 1188px · viewport 880px
by bubble 12 the newest message is already below the fold
V1's first quick-reply row sits at y=1265 in an 880px viewport
```

**Effect on a real buyer:** from roughly the eighth message, every new message
lands below the fold with no cue that anything is happening, and so does every
button — the quick replies, the accept/decline CTA, and the shipping form. She has
to scroll manually, repeatedly, to keep the conversation on screen and to find the
buy button.

**Who is affected:** both upsell steps on all six funnels that share these two
components — `/welcome1` `/welcome2` (V1 email traffic), `/fb`, `/fb2`,
`/fb-palm`, `/fb-tarot`, `/gdn`.

**Who is NOT affected, and must not be touched:**
- `client/src/pages/ChatPage.tsx` — the main V1 chat. It uses `fixed inset-0` +
  `h-full`, which is already correctly constrained. **It is fine. Leave it alone.**
- The soulmate funnel's own upsell pages (`SoulmateUpsellPage.tsx`,
  `SoulmateUpsell2Page.tsx`) — separate components, not affected.
- `/tarot/twin-flame/welcome1` and `/welcome2` — already fixed, see below.

## What is already done

Offer 02's tarot upsells opted into the fix, because their flow pauses on a tap
the buyer has to be able to see. Both files currently carry:

```ts
const pinnedShell = isTwinFlameOffer();
```

…and use it in two class names per file. That flag is the ONLY thing standing
between the current state and the rollout. Verified after the 02 fix: the tap
lands at 832–864px in an 880px viewport, page no longer overflows, auto-scroll
works, newest bubble sits clear of the footer.

The auto-scroll effect in both files already re-runs when the footer grows
(`showContinue` / `showCTA` / `showDownsellCTA` / `showShippingForm` are in its
deps). That was deliberately made global because it is a no-op wherever the
container is not scrollable. **Do not remove those deps** — after this change they
are what stops the newest bubble being clipped behind the footer.

---

## Do this

### 1. Decide `h-screen` vs `h-dvh` FIRST

The current 02 fix uses `h-screen` (= `100vh`). On mobile Safari and Chrome
Android, `100vh` is taller than the visible area while the address bar is showing,
which would push the footer — and therefore the buy button — partly under it. That
would recreate a milder version of the bug you are fixing, on the traffic that
matters most.

This project runs Tailwind v4 (`tailwindcss ^4.1.14`), which supports `h-dvh`
(dynamic viewport height). Nothing in `client/src` uses `h-dvh` today.

**Recommended: use `h-dvh`,** and change offer 02's two usages to match so all
funnels behave identically. If you have a reason to prefer `h-screen`, that is a
defensible call — but make it deliberately and write down why.

### 2. Make the shell unconditional in both files

`client/src/pages/UpsellPage.tsx` and `client/src/pages/Upsell2Page.tsx`:

- Replace the outer column's conditional class with the pinned one, always:
  `${pinnedShell ? "h-screen" : "min-h-screen"}` → `h-dvh` (or `h-screen`).
- Replace the message list's conditional with `min-h-0`, always:
  `${pinnedShell ? "min-h-0" : ""}` → `min-h-0`.
- Delete the now-unused `const pinnedShell = …` line and its long explanatory
  comment block (the bug it describes will no longer exist).
- Remove `isTwinFlameOffer` from the `../lib/funnel` import **if nothing else in
  that file uses it**. Check before deleting — `funnelPath` is imported from the
  same place and is definitely still used.

Do not change anything else in these files. In particular do not restructure the
footer, the message list, or the auto-scroll effect.

### 3. Verify — measure, do not eyeball

Start the app (`npm run dev`, port 5000). For **each** of these URLs:

```
/welcome1?demo=true          /welcome2?demo=true
/fb/welcome1?demo=true       /fb/welcome2?demo=true
/fb2/welcome1?demo=true      /fb2/welcome2?demo=true
/fb-palm/welcome1?demo=true  /fb-palm/welcome2?demo=true
/fb-tarot/welcome1?demo=true /fb-tarot/welcome2?demo=true
/gdn/welcome1?demo=true      /gdn/welcome2?demo=true
/tarot/twin-flame/welcome1?demo=true   (regression — must still be correct)
/tarot/twin-flame/welcome2?demo=true
```

…assert all of the following once the first interactive element appears (the
quick replies on the V1-style funnels, the continue tap on twin-flame):

1. `document.documentElement.scrollHeight <= window.innerHeight + 1` — the page
   itself no longer scrolls.
2. The message container DOES scroll: `scrollHeight > clientHeight`.
3. The button's bounding box is fully inside the viewport.
4. The newest message's `bottom` is above the button's `top` — nothing clipped.

Test at **three viewports at least**: `430×880` (modern phone), `375×667`
(iPhone SE — the tightest realistic case, where header + footer eat the most), and
`1280×900` (desktop). The 375×667 case is the one most likely to expose a problem;
check the message area still has usable height there.

The V1 upsell flow takes ~4–5 minutes of scripted typing delays to reach the first
question, so drive this with Playwright rather than by hand — the repo has it
installed. A working reference measurement script is in the conversation that
produced this document; the four assertions above are the whole of it.

Also confirm the flows still WORK, not just that they fit:
- quick replies still advance the conversation on a V1 funnel;
- the accept CTA still appears at the end and the shipping form is reachable;
- twin-flame's three continue taps still fire (bubbles 15/30/41 on U1,
  11/29/42 on U2).

### 4. Run the tests

```
npx vitest run tests/twin-flame-upsell-copy.test.ts
npx tsc --noEmit          # expect 46 pre-existing errors, no new ones
```

None of them cover layout, so they prove only that you broke nothing else.

### 5. Add the regression test that does not exist yet

`docs/test-ideas.md` already carries this as an open item. Add a Playwright spec
asserting the four conditions above on at least `/welcome1` and `/welcome2`, so
this cannot silently come back. This is the deliverable that stops a third person
rediscovering the same bug.

---

## While you are in here: the volume toggle steals taps

Same two files, same "fixed for offer 02, pending for the live funnels" status.

`<BackgroundMusic />` renders at `fixed bottom-4 right-4`, 44×44, `z-50`. The
upsell CTA stack is full-width to `right-4`, so the two share a right edge.
Measured at the CTA on this branch:

```
430×880   overlap 44×38 = 1672px²   covers the last 11% of the decline button
375×667   overlap 44×38 = 1672px²   covers the last 13%
elementFromPoint at the toggle's centre → the music icon, NOT the button beneath
```

With the shipping form open it sits on the **submit** button instead. The button
centres still work, so this is a nuisance rather than a blocker — but it is on
primary actions.

Offer 02's fix: `BackgroundMusic` now takes an optional `positionClass` (default
unchanged, so every other page is byte-identical), and the upsell pages pass
`absolute top-2 right-3` when `pinnedShell` is on. ⚠ A *bottom* offset cannot
work — the footer is ~134px at the CTA and ~400px with the shipping form open, so
no fixed value clears both.

To roll out: pass that same `positionClass` unconditionally, exactly as you make
the shell unconditional in step 2. Verify with `elementFromPoint` at the toggle's
centre — it must return the toggle itself, and the decline/submit buttons must
have zero overlap with it.

## Risk, rollback, and what to watch

- **Blast radius:** two files, six funnels, both upsell steps. No server, payment,
  tracking or copy changes. Nothing about what is charged or when.
- **Rollback:** revert the commit. There is no data migration and no state, so a
  revert is complete and instant.
- **Deploy when you can watch it.** The upsell take-rate is the number that should
  move — if buyers have been failing to find the accept button, it should go UP.
  Compare U1 accept rate and U2 accept/downsell rate for a few days against the
  same weekdays before.
- **If take-rate drops instead**, revert first and investigate second. A drop
  would most likely mean the footer is now covering content on some device, or the
  message area has become too short to read comfortably on small screens.

## Context, if you want the full story

- `improve-v1/v1-one-time-BEs/docs/00i-DELIVERABLES-U1-U2.md` — the section
  "A pre-existing V1 defect found while verifying the taps" records the original
  measurements and why offer 02 opted in alone.
- `docs/test-ideas.md` — the open checklist item for the regression test.
