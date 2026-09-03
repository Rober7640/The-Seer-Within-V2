# 06-E1 — Subject-line bank *(Wishing Bracelet · creature-first symbolism reveal)*

Format follows the deck's proven shape (`00e-FRAMEWORK-BEs.md` §2): **emoji + first-name FIRST +
curiosity**, never the reveal, under the 120-byte hard cap counted with the AWeber tag expanded.
Companion letter: `06-E2-esl-product-creature-a-close-c.md`.

**Rules applied**
- One emoji, at the front. Never two, never mid-line.
- `%FIRSTNAME%` second element, always — builds to `{{ subscriber.first_name | capitalize }}`.
- Curiosity, never the reveal.
- No deadline language, no price, no SLA in a subject line.
- Preheader continues the subject, never repeats it.
- **The curiosity payoff lands within ~40-45 visible characters, not just under the byte cap** —
  most phone inbox UIs truncate a subject around 35-45 visible characters, so the hook has to
  finish (or leave a real trailing filler word to absorb the cut) well before that point, not in a
  clause the inbox never shows. Rewritten 2026-09-02 for exactly this — see build note below.

---

## For `06-E2-esl-product-creature-a-close-c` — the chosen letter

| # | Subject | Preheader |
|---|---|---|
| **1 ★** | 🐉 %FIRSTNAME%, a very strange creature tonight | Not a reading. Just something I think you should know about. |
| 2 | 🐉 %FIRSTNAME%, he has no way out | That's the whole point of him. Once something reaches him, it never leaves. |
| 3 | 👑 %FIRSTNAME%, dragon head, lion body | There's an odd rule to why they're paired — none of it's decoration. |
| 4 | 🪙 %FIRSTNAME%, he ate an emperor's treasury, truly | And was sealed shut for it. That's not a metaphor — that's the actual myth. |
| 5 | 🐉 %FIRSTNAME%, he has two heads, not one | One pulls money toward you. The other one won't let it go again. |
| 6 | 🪙 %FIRSTNAME%, why teaching, not a reading, tonight | You'll understand why by the letter's end. |

★ = lead. Announces the subject plainly — "a very strange creature" — rather than a hook-device or
an instruction, matching the letter's own "creature-first" register.

**Nameless challengers** — kept to prove the override, not to ship untested:

- `A creature with no way out`
- `Every part of him means something`

## For `06-E6` — abandon nudges *(not written this pass)*

Deferred — no booking page or bump exists yet for 06 to nudge back toward.

---

## Notes for the build

- **Send-time and segment:** inherit the deck's proven slot (6:30pm SGT) and the be-customer list
  segmentation used for 02–04.
- **Emoji rotation:** 🐉 (Pixiu), 👑 (the court/authority — the dragon-head symbolism), 🪙 (wealth).
  Distinct from candidate C's set (🐉🪨🧧) and every other 06 bank.
- **None of these lines mention her problem or the bracelet as a product** — the whole bank stays
  in the letter's own "let me tell you about a creature" register, consistent with the problem
  arriving late in the letter itself.

- **All 6 subjects rewritten for mobile truncation, 2026-09-02 — operator: "subject lines are too
  long — need curiosity yet self contained."** Every original subject already passed the 120-byte
  hard cap (61-68 bytes name-substituted, 96-103 worst-case with the AWeber tag expanded) — the cap
  was never the problem. The real problem: most phone inbox UIs cut a subject around 35-45 visible
  characters, and every original line put its actual hook past that point (e.g. #1's "a very
  strange creature" only arrived after "tonight I want to tell you about," which is exactly what a
  phone would still be showing at the cutoff). Fixed by moving the payoff itself inside the first
  ~30-37 visible characters and, where there was room, adding a short disposable trailing word
  ("tonight," "truly") after the payoff to absorb the cut rather than clip it. Same 6 angles, same
  emoji rotation, same "curiosity never the reveal" rule — compression only, nothing re-angled.
  Verified name-substituted (`Sarah`) byte lengths: 29-48 bytes; worst-case liquid-tag-expanded:
  64-83 bytes — both far under the 120-byte cap, confirming length was never the binding
  constraint. Name-substituted character counts: 26-45, all landing inside the target window.
- **Subject 5 (the horn line) also updated in substance, not just trimmed.** The old line hedged
  ("one horn or two — I want to be honest about which... I haven't confirmed ours") because at the
  time nobody knew which variant the product was. The letter has since confirmed it (Beat 4,
  rewritten multiple times through 2026-09-02): a two-horned Bixie, the guardian rather than the
  puller. Keeping the old hedge would have made the subject bank contradict the letter it's meant
  to tease, so the line now states the confirmed fact ("he has two horns, not one") and the
  preheader teases the guardian-vs-puller distinction without giving it away — still curiosity, not
  the reveal, just no longer promising an uncertainty the letter no longer has.
- **Subject 5 superseded again, 2026-09-03 — the horn/Bixie/Tianlu framing itself is gone from the
  letter.** Operator (firsthand cultural source): the creature is Pi Chiu, two-headed, one head
  pulls wealth toward the buyer and the other keeps it — both real, not one real and one
  traditional-color. See `06-E2-esl-product-creature-a-close-c.md`'s own Build notes for the full
  letter-side rewrite (Beats 4/7/8). Subject 5 is now "he has two heads, not one" with a preheader
  that teases the pull-vs-keep split without spelling it out — same "confirmed fact, not a hedge"
  discipline the previous rewrite established, just against the new fact instead of the old one.
- **Stale companion-letter reference fixed.** This file's header and table title still pointed at
  `06-E2-esl-product-creature-a.md` and called it "the first letter" — that file was deleted in the
  2026-09-02 cleanup documented in `docs/06/0-WORKFLOW-06.md`'s Fourth-round audit note (root cause:
  this bank file was renamed to its current `-close-c` filename during that same cleanup, but its
  body was never updated to match). Both references now point at the actual finished, chosen
  letter, `06-E2-esl-product-creature-a-close-c.md`.
