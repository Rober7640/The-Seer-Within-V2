# 06-U2a — U2 opening beats *(PATH_A and PATH_B)*

| | |
|---|---|
| **Decision** | locked in [`../../docs/06/0-WORKFLOW-06.md`](../../docs/06/0-WORKFLOW-06.md)'s U1/U2 row, 2026-09-01: reuse V1's actual Protection Ritual + lava stone (U1) and Manifestation Bracelet (U2) verbatim — same pattern 02 already uses. Only the opening beats are rewritten; everything from `UPSELL2_GAP` onward is V1's, unchanged |
| **Engine** | reuses `useUpsell2Chat.ts` unmodified — the same pattern `02-U2a-upsell2-path-opens.md`'s own frontmatter documents |
| **Rewritten here** | `UPSELL2_PATH_A_OPEN` (bought U1, the Protection Ritual + lava stone) and `UPSELL2_PATH_B_OPEN` (declined it) |
| **The argument** | Pixiu holds what reaches the buyer — he has no way out. The Manifestation Bracelet calls what hasn't reached them yet. The same "arrives vs. calls" hinge 02 already uses, restated here as "what stays" vs. "what's found" |
| **Product sold** | V1's actual Manifestation Bracelet, unchanged. The engine's owns-both suppression (skip straight to thank-you if the buyer already has both) is 02's documented behaviour for this same engine — not yet given its own step number for 06, since Phase A hasn't started |
| **Source** | `client/src/lib/upsell2Messages.ts:51-71` — `UPSELL2_PATH_A_OPEN` / `UPSELL2_PATH_B_OPEN` are the two exports this file rewrites |
| **Built** | ☐ not yet — 06 has zero funnel code (`0-WORKFLOW-06.md`: "A — the funnel: ☐ everything") |

**Path A** follows a purchase and **must not re-sell or re-describe Pixiu or the stone** — it
stacks on both. **Path B** follows a decline and must not re-litigate it — it finishes an honest
thought already on the table (Beat 4's horn detail) rather than inventing a new one. 06 has no
divination device the way 02's fixed twelve-card spread does, so there is no reveal to defer into
this opening the way 02's Chariot-in-the-fifth-house line works; the "new" thing Path B produces is
completing what the letter already told the buyer, not a fresh claim about them.

---

## `UPSELL2_PATH_A_OPEN` — 6 messages *(bought the Protection Ritual)*

> {firstName}... both are confirmed now. Your Pixiu, and your protection alongside him. I'm glad
> you're not sending him to travel alone.

> Your lava stone holds your left side too — the same side Pixiu already guards — while you wait
> for him to reach you.

> But I want to ask you something before he arrives, and I want an honest answer...

> When what's yours is guarded on both counts, {firstName}... when nothing that reaches you can
> slip back out... what then?

> Pixiu holds what reaches you. The stone keeps watch while you wait for him. What neither one of
> them does is go out and bring something new back to you.

> A guardian is about what stays. Protection is about what doesn't get in. But what about what
> hasn't found you yet, {firstName}?

---

## `UPSELL2_PATH_B_OPEN` — 6 messages *(declined the Protection Ritual)*

> {firstName}... I respect your decision about the protection. Pixiu doesn't need it — he was built
> to guard on his own, and he'll do that work whether or not anything travels beside him.

> But there's a piece of him I only told you half of, and I'd rather finish it than leave it
> sitting.

> It isn't about the mouth, or the claws, or the seal. You already have all of that.

> It's about the horns.

> Two of them make him Bixie — the guardian, not the puller. He holds what reaches you. He was
> never built to go get you something new. That's not a flaw in him. It was just never his job.

> So here's the honest question underneath all of it, {firstName}: if he only guards what already
> reaches you... what calls the rest of it toward you in the first place?

---

## Build notes

- **The hinge is the same in both paths, and it is the letter's own limit.** Beat 7's "What this
  can't do" already says a creature with no exit can only keep what reaches him — he can't
  manufacture a fortune that was never coming. This upsell doesn't contradict that; it asks the
  question that limit raises. A guardian holds. It does not call (→ this upsell). Two guard-products
  in Path A, one calling product — which is what stops them cannibalising each other.
- **Path A stacks, Path B completes.** A follows two yeses, so it opens on completion and then
  finds the one thing still missing — same shape as 02's Path A. B follows a no, so it does not
  argue; but where 02's Path B produces genuinely NEW information from its fixed spread (the
  Chariot, already assigned to house five for every buyer), 06 has no equivalent device to draw
  from — no cards, no reading, nothing that resolves later the way a spread does. Inventing a
  parallel "something is already travelling toward you" claim here would have no mechanism behind
  it. So Path B instead finishes Beat 4's horn detail — Bixie, the guardian, not the puller — which
  the buyer has already read and which the letter never followed to its own conclusion. That's honest,
  already on the table, and it's the "natural next question," not new mythology.
- **Both wrists line up on purpose.** Pixiu is worn on the left wrist (Beat 8, "the receiving
  side"), and V1's lava stone already guards "your left side — your receiving side" in its own
  unchanged copy. Path A's message 2 reuses that shared placement rather than inventing a new one,
  so the two guard-products read as the same kind of thing going into the pivot, not two unrelated
  rituals stacked at random.
- ⚠ **Path A must not mention either product's price or re-describe Pixiu's anatomy/mythology or
  the stone's ritual.** The buyer just secured both. Message 1 acknowledges them in one line and
  moves on; anything more reads as a receipt they didn't ask for.
- **No third-party outcome in either path.** What calls toward the buyer is described as
  *something*, never as a named person doing a named thing — same rule 02 follows.
- **No personal details used anywhere.** No situation, no concern, no name of anyone they asked
  about — 06's booking page collects nothing, same as 02, so there is nothing to draw from even if
  the rule allowed it.
- **No dollar figures.** Neither Pixiu nor the Protection Ritual is priced here. The Manifestation
  Bracelet's own price and downsell figure live untouched inside the reused `UPSELL2_PRICE` /
  `UPSELL2_DOWNSELL` blocks (from `UPSELL2_GAP` onward) — not repeated in this file.
- **Verb is never "buy."** "confirmed," "secured," "decision," matching deck convention.
- **`{firstName}` × 3 in A, × 2 in B**, matching 02-U2a's distribution.
- **De-gendered, 2026-09-02 — operator: the be-customer list includes men, and this offer skews
  more male than female.** Unlike `06-U1a`, the actual buyer-facing chat messages here were already
  fully in direct "you" address — no fix needed there. The gendered language was confined to the
  frontmatter table and Build notes (internal, never rendered to a buyer), fixed for consistency
  anyway. Same pass applied across the whole offer — see `docs/06/0-WORKFLOW-06.md` for the full
  file list.
