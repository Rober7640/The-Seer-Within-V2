# 06-E1 — Subject-line bank *(Wishing Bracelet · Aiden cross-promo variant)*

Format follows the deck's proven shape (`00e-FRAMEWORK-BEs.md` §2): **emoji + first-name FIRST +
curiosity**, never the reveal, under the 120-byte hard cap counted with the AWeber tag expanded.
Companion letter: `06-E2-esl-AIDEN-close-c.md`.

**Rules applied** — same as `06-E1-subject-lines-product-creature-a-close-c.md`, plus one addition:
- One emoji, at the front. Never two, never mid-line. 🔢 chosen for Aiden specifically (his own
  established emoji, matching his numerology identity — distinct from the 🐉/👑/🪙 rotation the
  Evelyn-sent bank uses, since this send is under his identity).
- `%FIRSTNAME%` second element, always — builds to `{{ subscriber.first_name | capitalize }}`.
- Curiosity, never the reveal. No deadline language, no price, no SLA. Preheader continues the
  subject, never repeats it.
- Curiosity payoff lands early enough that mobile truncation (~35-45 visible characters) doesn't
  cut the hook itself — same discipline as the Evelyn-sent bank's own rewrite.

---

## For `06-E2-esl-AIDEN-close-c` — Aiden's cross-promo letter

| # | Subject | Preheader |
|---|---|---|
| **1 ★** | 🔢 %FIRSTNAME%, Evelyn wasn't going to tell anyone this | She told me not to send this. I did anyway. |

★ = lead, and currently the only entry — this is a single cross-promo send, not a rotating bank the
way the Evelyn-sent letter's 6-subject set is. This is the exact subject/preheader pair already
drafted and approved in-session as the "secret lead" Beat 0 (see `06-E2-esl-AIDEN-close-c.md`'s own
Build notes for the four-pass history behind it) — this file exists so
`render-be-esl-preview.mjs` can actually find it; the render was previously showing "subject: none
found" because no `06-E1-subject-lines-AIDEN-close-c.md` existed yet, even though the subject/
preheader text was already settled and living in the letter's own H1 + italic payoff line.

---

## Notes for the build

- **Byte lengths, verified:** 51 bytes name-substituted (`Sarah`), 86 bytes worst-case with the
  AWeber tag expanded — both well under the 120-byte cap. 48 visible characters name-substituted,
  slightly past the ~40-45 mobile-truncation target window, but the core hook ("Evelyn wasn't going
  to tell anyone") lands before the cut point — only the trailing "this" risks getting clipped,
  same acceptable trade-off the Evelyn-sent bank's own trailing-filler-word pattern uses elsewhere
  (e.g. "tonight," "truly").
- **Send-time and segment:** unresolved — this is a cross-promo to Aiden's own list, not the
  be-customer backend list `06-E2-esl-product-creature-a-close-c.md` sends to (see that letter's
  frontmatter "Sends to" row, which already flags this same open question). Confirm the actual
  list/segment and slot before this goes live.
- **No dollar figures, no delivery-time-as-SLA** — matches the letter's own discipline.
