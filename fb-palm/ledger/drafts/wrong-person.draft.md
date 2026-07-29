# DRAFT — hook `wrong-person`  ·  headline: "Why do I keep falling for the wrong person?"  ·  status: **WIRED** (approved by Lewis 2026-07-29, wired same day)

**Question (what she wants):** why the same ending keeps happening — and whether the fault is in her · **Source:** operator (Lewis, 2026-07-29 headline set) · **Frame:** `self` · **Target signs:** `heart-line` only
**Strategy:** one of four headlines supplied for the `heart-line` photo lander. Headlines 1–2 were the waiting wound and reuse `soulmate-timing`'s reads verbatim (already wired). This one is a genuinely **new wound** — the repeating pattern — so it needs its own `hook_pain`, Version-C question and reads. Ad sub-line *"This heart-line pattern may reveal why."* lives in the FB creative only (operator decision: no per-hook lander sub-line).

> ✅ **Approved and wired 2026-07-29.** All edits landed: `PalmHook` union + `PALM_HOOKS` + `HEADLINES` + `PALM_QUESTION` + `reads['wrong-person']` on `HEART_LINE` (client), `PALM_HOOK_PAIN` + `PALM_HOOK_YES` (server), both `validHooks` arrays (`routes.ts` 470 + 483). One copy change on the way in: *recognise* → *recognize*, to match house spelling ("nearer than you realize" elsewhere in the registry) — reflected below.

## ⚠ Why this hook needs a `PALM_HOOK_YES` entry

The wound invites two answers Evelyn must never give: a verdict on a past partner ("he was a narcissist") and a verdict on her ("you have an attachment problem"). Left out of `PALM_HOOK_YES`, Version C falls through to `DEFAULT_HOOK_YES` — *"yes, she has already met them / yes, she will love again / yes, it is close"* — which does not fit this question at all and would let the LLM improvise the answer. An explicit entry is required, not optional.

## Hook-level copy
- **headline:** *Why do I keep falling for the wrong person?* (operator-supplied, verbatim — message scent)
- **instruction (sign-level, unchanged):** *Cup your hands together — tap the one that matches.*
- **CTA (Version A):** sign-level CTA stands — *There's more your palms are telling me — begin your free reading ▸*
- **`hook_pain` (server / Version-C injection):** *She keeps ending up with people who turn out wrong for her, and she is asking what it is in her that keeps choosing them — carrying the pattern as though it were her own fault.*
- **`palm_question` (Version-C opener):** *Before I look closer, tell me… what keeps repeating that you're tired of living through?*
- **`PALM_HOOK_YES` (proposed):** *yes, the pattern she has noticed is real and it is not a defect in her — her heart has been reading love correctly, only early and too generously. NEVER pass judgement on any past partner and NEVER tell her something is wrong with her; affirm HER knowing and her worth, never a diagnosis.*

## Reads — `reads["wrong-person"]["heart-line"]` (4-beat build)

**A — lines meet with a step between them · the rising heart**
1. "Your heart lines rise toward each other but hold a small space between them — the rising heart."
2. "You're asking why it keeps being the wrong one — and underneath that, whether the fault is somewhere in you."
3. "It isn't, dear — a rising heart reaches before it has been shown where to land, and that small space is the part of you that always knew, long before the ending came; the pattern isn't your flaw, it's your knowing arriving ahead of your choosing."
4. "Let me look closer at what that space has been trying to tell you…"

**B — lines meet as one unbroken line · the joined heart**
1. "Your heart lines reach across and meet as one unbroken line when you cup your hands — the joined heart."
2. "You're asking why the wrong ones keep finding you, when you give so completely each time."
3. "Because a joined heart gives whole from the very first day, dear — it doesn't hold part of itself back to test them; that isn't a fault to be fixed, it's the very thing the right one will recognize, and your heart has never once read love wrongly, only early."
4. "Let me look closer at what has been arriving too early…"

## Self-check vs generation spec
- 4-beat build · mark named in sentence 1 · archetype label closes beat 1 ✓
- Beat 2 mirrors her question and names the self-blame underneath it ✓
- **Self-frame:** the hand reads HER — her reaching, her giving, her knowing. No partner appears as the subject the palm reads ✓
- Beat 3 affirms **her knowing and her worth** with certainty, and reframes the pattern as her instrument working early rather than a defect — never a verdict on a past partner, never a diagnosis of her ✓
- Verdict withheld → open loop "let me look closer" ✓ · no date/name/guarantee/exclamation/emoji ✓ · mark named, never the letter ✓
- Archetype consistency: rising = reaches before it lands · joined = gives whole from day one — the same meanings the sign carries on every other hook ✓
