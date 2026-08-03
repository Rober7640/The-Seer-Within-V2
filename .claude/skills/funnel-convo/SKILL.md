---
name: funnel-convo
description: "Print the full scripted conversation of a v1 chat-style salespage as a readable transcript — happy path plus every branch (quick-reply variants, decline exit, CTA button copy). Use when the user says: print the U1/U2 convo, show me the protection ritual script, what does the upsell chat say, print the manifestation bracelet conversation, dump the funnel copy, read the salespage script. Reads the message constants + the driver hook (for true stage order) and renders clean copy — no code, no commentary unless asked."
---

# Funnel convo — print a v1 chat-style salespage script

These pages are **fully scripted chat theater** (canned message arrays played with
typing delays; quick replies branch only the acknowledgment lines, never the flow).
This skill turns the code into a transcript the operator can actually read.

## Source map

| Page | Route | Messages (copy source of truth) | Driver (stage order) | CTA copy |
|---|---|---|---|---|
| **U1 — Protection Ritual** | `/welcome1` | `client/src/lib/upsellMessages.ts` | `client/src/hooks/useUpsellChat.ts` | `client/src/components/upsell/UpsellCTA.tsx` |
| **U2 — Manifestation Bracelet** | `/welcome2` | `client/src/lib/upsell2Messages.ts` | `client/src/hooks/useUpsell2Chat.ts` | CTA components imported by `Upsell2Page.tsx` |

Not covered by this skill (say so if asked, don't force-fit):
- **Main funnel `/chat`** — AI-driven (state machine + Claude). No fixed transcript
  exists; offer the system prompts (`client/src/lib/prompts.ts`, server-side prompt
  builders) and the phase outline instead.
- **Soulmate upsells** (`SoulmateUpsellPage.tsx`, `SoulmateUpsell2Page.tsx`) —
  static salespages, copy inline in the page component (`STEPS` array etc.).
  Printable, but as page copy, not a chat transcript.

## Method (do these in order)

1. **Read the messages file** — it has every copy block as named exports.
2. **Verify stage order in the driver hook** (`grep "UPSELL_" hooks/use*Chat.ts`).
   Never assume file order = play order. The hook is also where you confirm which
   branches exist and where accept/decline diverge.
3. **Grab CTA button copy from the component** — button labels, microcopy above/below
   ("Take your time. This is your journey.", price fine print) are part of the
   experience but live outside the messages file.
4. **Check for A/B variants** — copy may have live experiment variants (see
   `/admin/experiments`, `server/lib/experiments.ts`). If a variant version of the
   messages exists, ask which arm to print (or print both labelled).

## Page-specific notes

**U1:** Flow = CONFIRMATION → GAP → RISK → Q1 → SOLUTION → LAVA_INTRO → Q2 →
RITUAL → FEEL → Q3 → BUCKET (love/money/purpose/someone — 4 variants) → DELIVERY →
OFFER → CTA. Accept → SUCCESS → shipping form → SHIPPING_CONFIRMED → U2 Path A.
Decline → SOFT_DECLINE → U2 Path B. Price: `formatUpsellPrice` defaults **$47**.
`{firstName}` falls back to "dear", `{personName}` to "them".

**U2:** Two openings — PATH_A_OPEN (bought U1) vs PATH_B_OPEN (declined). Contains
an **AI-generated segment** (manifest reveal via `POST /api/upsell2/reading`) — render
it as `[AI-GENERATED: manifest reveal — personalized per user]`, don't invent copy.
Also has RITUAL_PATH_A_EXTRA (only shown to Path A), SOCIAL_PROOF → PRICE ($47) →
URGENCY → DOWNSELL ($30) branch, and three success variants
(SUCCESS / HAS_SHIPPING / NEEDS_SHIPPING).

## Output format

Unless the user specifies otherwise, default to **"Both"**: happy-path transcript
first, then a branch appendix. Ask (or state assumptions) only when it changes the
output: which page, which bucket (default: show all four inline at the BUCKET
section), clean vs annotated (default: **clean** — copy only, no persuasion
commentary).

Transcript conventions:
- Bot lines as `>` blockquotes, one line per chat bubble, grouped under a bold
  section label (**The gap**, **Question 2**, …).
- Quick replies shown in italics after each question; the happy path takes the
  first/"yes" reply.
- CTA rendered as the actual button stack (labels + microcopy + fine print).
- Keep `{firstName}` / `{personName}` placeholders as-is; note their fallbacks and
  the price default once at the top.
- Branch appendix: for each question, the alternate replies + their acknowledgment
  lines, the typed-input `default` branch, then the decline path. Note explicitly
  that branches reconverge (the only real fork is accept/decline).
- End with where the page redirects on accept vs decline.

Gold-standard example of the expected output: the U1 transcript produced 2026-07-09
(happy path + all four bucket variants + branch appendix, clean).
