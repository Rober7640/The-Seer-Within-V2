# New-Ads Build Status — palm "quiz bridge" signs

Tracks each ad concept in `fb-palm/docs/new-ads/` as it gets wired into the
`/fb-palm` funnel. Each concept = one **sign** (a physical "tell" the ad quizzes).
Adding a sign = one `SignConfig` entry in `client/src/content/palmReads.ts` +
its strip art in `client/public/palm/` + a server vocab entry in
`server/lib/prompts.ts` (`PALM_SIGN_VOCAB`) + the validator enum in
`server/routes.ts`. The bridge UI, chat handoff, and 3-version A/B/C split are
all sign-agnostic — they read from the registry, so no per-sign UI code.

**Live links once a sign ships** (replace `<sign>`):
```
A: https://www.theseerwithin.com/fb-palm?hook=<hook>&sign=<sign>&seg=<seg>&utm_content=<ad>
B: https://www.theseerwithin.com/fb-palm/b?hook=<hook>&sign=<sign>&...
C: https://www.theseerwithin.com/fb-palm/c?hook=<hook>&sign=<sign>&...
```
`hook ∈ { soulmate-timing · already-met · love-again }`. Omitting `sign` = the
original `thumb` sign (unchanged).

---

## Per-sign checklist (what "done" means)

For each sign:
- [ ] Strip art copied to `client/public/palm/<sign>-strip.png` (equal horizontal panels)
- [ ] `SignConfig` added to `SIGNS` in `palmReads.ts` (eyebrow, instruction, beatNoun, CTA, chooseMoment, strip dims, options, mark, reading)
- [ ] 9 reads written (3 hooks × 3 options, or 6 for 2-option) — 4-beat build, Appendix B voice
- [ ] Server vocab added to `PALM_SIGN_VOCAB` (`prompts.ts`) — mark + reading mirror the client
- [ ] `validSigns` enum updated in `routes.ts`
- [ ] Verified at mobile width: A card · B chat · C reflect-fallback
- [ ] VWO/ad links handed to media buyer

---

## Concepts

| # | Folder | Sign id | Options | Status | Notes |
|---|--------|---------|---------|--------|-------|
| 1 | `finger-lock-01` | `finger-lock` | 3 (right / parallel / left thumb on top) | ✅ **BUILT** | Archetypes: A leading · B mirrored · C guarded heart. Strip = `finger-lock-strip.png` (1041×587, clean thirds). |
| 2 | `finger-shape-01` | `finger-shape` | 3 (straight / pointy / knuckled) | ✅ **BUILT** | Archetypes: A steady · B dreaming · C discerning heart. Strip 959×725, clean thirds (audited). |
| 3 | `palms-06` | `palms` | 3 (same height / right higher / left higher) | ✅ **BUILT** | Archetypes: A even · B giving · C deep heart. Strip 1080×551, clean thirds (audited). Art labels 1/2/3; keys a/b/c (aria says "Option A" — minor SR nit). |
| 4 | `palm-signs-03` | `palm-signs` | 2 (A / B) | ✅ **BUILT** | Archetypes: A joined · B rising heart. Strip 800×493, clean halves (audited). |
| 5 | `thumb-curve-01` | `thumb-curve` | 2 (straight / bends back) | ✅ **BUILT** | Archetypes: A constant · B open heart. Strip 946×580, clean halves (audited; tiny B-sliver bleed into A, cosmetic). |
| 6 | `thumb-curve-02` | `thumb-curve-alt` | 2 (straight / curved) | ✅ **BUILT** | Abstract-art variant of #5 — **reuses thumb-curve's reads**, separate sign only for a realistic-vs-abstract art test. Strip 1080×519. |
| 7 | `hand-size-01` | `hand-size` | 2 (big / small) | ✅ **BUILT** | Archetypes: A sheltering · B daring heart. Source art was stacked vertically → **recomposed side-by-side** into `hand-size-strip.png` (2160×406). Big/small look similar (relies on self-knowledge). |
| 8 | `_pdc-finger-length-01` | `finger-length` | 3 (ring tall / even / index tall) | ✅ **BUILT** | Index-vs-ring digit ratio. Archetypes: A magnetic · B harmonious · C certain. Strip 919×474, clean thirds (audited). |
| 9 | `_pdc-finger-length-02` | `finger-length-alt` | 3 | ✅ **BUILT** | Full back-of-hand art variant of #8 — **reuses finger-length's reads**. Strip 969×653, clean thirds (audited). |
| 10 | `_pdc-hand-size-02` | — | 2 | ⛔ Parked | Split-panel line-art variant of #7 (`hand-size` already built). |

**Legend:** ✅ built & wired · ⬜ pending (art is good, just needs config + copy) · ⛔ parked.

---

## Open per-concept decisions (resolve before building each)

- **`thumb-curve-02` (#6):** is it the same `thumb-curve` sign with alternate art (A/B test the *visual*, same reads), or a separate sign? Recommend: same sign, swap `strip.url` via a 2nd creative — no new copy.
- **`hand-size-01` (#7):** the provided strip stacks the two options vertically. Either (a) re-export as a side-by-side strip, or (b) add a `stripOrientation: 'vertical'` option to `SignConfig` + crop logic. Recommend (a) — keeps the crop code simple.
- **2-option signs:** the grid already supports `grid-cols-2`; `parsePalmParams` already restricts the tapped option to `sign.options`. Reads only need A/B (6 reads, not 9).
