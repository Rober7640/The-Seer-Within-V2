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
original `thumb` sign (unchanged). Some signs also carry their own scoped hooks
(ledger `target_signs`) — e.g. `heart-line` adds `right-person` ·
`love-taking-long`. A hook only works on a sign that has `reads` for it;
`parsePalmParams` returns null otherwise and the visitor silently drops into the
generic funnel, so never hand out a hook×sign combo the registry doesn't cover.

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
| 11 | `thumb-angle-01` | `thumb-angle` | 2 (aligned / not aligned) | ✅ **BUILT** | Does the life line's arc run true with the line of the thumb. **A = aligned · B = not aligned** (per Rio, 7/21 — supersedes the earlier "open-handed / close-held" wide-vs-narrow read). Archetypes: A the true heart · B the seeking heart. Strip 1357×1027, clean halves. ⚠ Runs its own $55/$35 test through the **experiment framework** (`v1_main_price_2026`, `scope.sign`), NOT the legacy system_config pool — it is in `OTHER_SIGNS`, so it can never draw the thumb-only 70/30. |
| 12 | `palm-signs-03/heart-line.png` | `heart-line` | 2 (A / B) | ✅ **BUILT** | **Photo variant of #4** — the same tell (where your heart lines meet when you cup your hands), shot as a real photograph instead of the illustration, so the two creatives test head-to-head with identical copy. Strip 800×493, clean halves — dimensions matched to #4 on purpose so the art test isn't confounded by the two creatives rendering at different sizes. **Optimize the source before copying it in:** the supplied `heart-line.png` was 751 KB at 1000×616 with a pointless alpha channel; flattening to white + a 128-colour palette (sharp) gives 63 KB, in line with the rest of `client/public/palm`. ⚠ **The panels are REVERSED vs #4**: here **B** = lines meeting as one unbroken line (*the joined heart*) and **A** = meeting with a step between them (*the rising heart*). The config therefore swaps a↔b programmatically off `PALM_SIGNS` instead of using the usual `...SPREAD`, and `PALM_SIGN_VOCAB['heart-line']` is a full entry rather than an alias. Carries **four** scoped hooks: `right-person` · `love-taking-long` (headline-only variants of the soulmate-timing wound — reads inherited verbatim) and `wrong-person` · `relationship-right` (new wounds — **own** reads, written in this sign's orientation, so never run them through `swapAB`). The latter two each carry a load-bearing `PALM_HOOK_YES` entry; without it they fall through to `DEFAULT_HOOK_YES` ("her real one is still out there"), which for `relationship-right` reads as a nudge to leave. |

**Legend:** ✅ built & wired · ⬜ pending (art is good, just needs config + copy) · ⛔ parked.

---

## Open per-concept decisions (resolve before building each)

- **`thumb-curve-02` (#6):** is it the same `thumb-curve` sign with alternate art (A/B test the *visual*, same reads), or a separate sign? Recommend: same sign, swap `strip.url` via a 2nd creative — no new copy.
- **`hand-size-01` (#7):** the provided strip stacks the two options vertically. Either (a) re-export as a side-by-side strip, or (b) add a `stripOrientation: 'vertical'` option to `SignConfig` + crop logic. Recommend (a) — keeps the crop code simple.
- **2-option signs:** the grid already supports `grid-cols-2`; `parsePalmParams` already restricts the tapped option to `sign.options`. Reads only need A/B (6 reads, not 9).
