# 5-Phase Question A/B — Results + Honest Read

**Date:** 2026-07-05 · Same input & model (`claude-sonnet-4-5-20250929`), 2 trials/arm, only the
closing-question block swapped per builder. Raw: [`evidence/five-phase-ab-output.txt`](./evidence/five-phase-ab-output.txt) ·
rerun: `npx tsx improve-v1/evidence/five-phase-ab.ts`.

## Side-by-side (closing questions)

| Phase | CURRENT (canned) | IMPROVED (anchored on her words) | Verdict |
|---|---|---|---|
| **reading1** | "What happened that made you believe you'd already missed your chance?" | "When you watch your friends with their families, what feeling rises first — longing, or something sharper?" | **Modest** — current already adapted (didn't parrot); improved a touch sharper |
| **reading2** | "**Paint me a picture**, Sarah... what would real love actually feel like for you?" | "When you're on these dates that go nowhere... what are you actually hoping they'll see in you?" | **Big win** — current parroted 2/2; improved anchors on "dates" |
| **futureValidation** | "**How would that feel**, Sarah?..." | "When you imagine him truly seeing you — what part of yourself are you most hoping he'll understand?" | **Good** — current parroted "how would that feel"; improved is specific |
| **crisisReveal** | "has anyone in your family carried this same **loneliness**? Your mother? Grandmother?" | "You said it would feel like breathing again... what made you stop breathing in the first place?" | **Big win on sharpness — but see caveat** |
| **crisisCost** | "If you could finally release this **block** today, would you?" | "If you could stop measuring your worth by other people's timelines, would you let yourself be seen again?" | **Big win** — specific, still a clean yes/no |

## Honest read

- **The fix helps most exactly where the canned examples were stickiest** — `reading2`, `crisisReveal`,
  `crisisCost` parroted the template near-verbatim on the current prompt; the improved versions are sharp and
  personal. `futureValidation` improves clearly too.
- **`reading1` is already okay.** Its current output adapted to her words without reciting the examples, so the
  gain there is modest. (Good to know — not every phase is equally broken.)
- **Every improved question stayed truthful** — anchored on her own words, no invented facts. The
  accuracy guardrail held.

## ⚠️ One caveat that matters for conversion — `crisisReveal`

The current `crisisReveal` question ("has anyone in your **family** carried this…") isn't just lazy — it's an
intentional **persuasion device**. Framing the block as *inherited / ancestral* makes it feel external and
therefore **clearable by a ritual** — which is the bridge to the $35 Energy Clearing offer. The improved
version ("when did you first decide you're broken?") is a sharper *cold read*, but it reframes the block as
**personal/psychological**, which reads more like therapy than energy work and may be a **weaker setup for the
offer**.

**Takeaway:** specificity must serve the conversion arc, not just feel sharper. The `crisisReveal` fix should
be tuned to *keep the block feeling like an external, inherited thing that can be cleared* **while** making the
specifics hers — e.g. *"This didn't start with you, Sarah — whose loneliness were you handed before you were
old enough to refuse it?"* Whether external-inherited vs personal-history converts better is a genuine **A/B
question for you**, not something to silently bake in.

## Recommendation (agreed direction — not yet implemented)

**Status 2026-07-05: evidence only. No prompt code was changed.** This is the ready-to-action spec for when
the operator picks it up.

1. Apply the specificity fix to **reading2, futureValidation, crisisCost** — clean wins, low risk.
2. Apply to **reading1** too (small gain, no downside).
3. **`crisisReveal` — DECIDED: inheritance-preserving.** Keep the *external / inherited* block frame (it sets
   up the clearing-ritual offer) while making the specifics hers. Reference wording:
   > *"This didn't start with you, Sarah — whose loneliness were you handed before you were old enough to
   > refuse it?"*
   The instruction block must (a) forbid the generic "has anyone in your family struggled with this same
   pattern," (b) require the block stay something *external and clearable*, (c) anchor on her exact words.
   (The sharper personal-history variant was considered and set aside — it reframes the block as
   psychological and weakens the offer bridge.)
4. When actioned: apply as pure `prompts.ts` string edits (5 builders), keep each phase's intent, preserve the
   base accuracy guardrail (anchor on their words, don't invent facts). Ship behind the usual build-then-review
   flow (these are live money prompts), then re-run `evidence/flow-transcript.mjs` to see the whole
   conversation read sharper end-to-end.
