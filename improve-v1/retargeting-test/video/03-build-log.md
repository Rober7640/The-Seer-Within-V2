# video — build log, findings and generation IDs

Photoreal Evelyn, 4:5 Facebook retargeting. Adapted from the baby-gordon SOP
(`Dropbox/unfallen-pipeline/BRIEFS/baby-gordon/0-WORKFLOW.md` + `BUILD.md`).

**Register approved 2026-10-04** and written into
`Dropbox/seerwithin-pipeline/BRIEFS/clay-ads/codex/_character-bible.md` as a third register
(photoreal, retargeting-only) with a scoped speaking exception. Cold / clay / song ads keep the
no-face, no-voice canon.

**Identity reference:** `uploads/avatars/hi-def/evelyn.png` (1024x1024) — NOT the 400x400 chat avatar.

---

## Locked Kling settings
`kling-video-v3_0` · **720p** (9 credits/s; **6 if silent**) · `enable_audio=true` ·
`prefer_multi_shots=false` (the default `true` silently splits a shot) · `imageCount=1` ·
whole seconds 3-15. A 4:5 first frame returns **856x1072**; the cut upscales to 1080x1350 (lanczos).
**v3_0 has no `aspect_ratio` argument — it takes the shape from the first frame.**
Stills: `gen_clay_images_codex.py`, format `portrait_4_5`.

## Findings, each paid for once
1. **One sentence per shot.** Two sentences made Kling inflate the beat between them to **3.7s**.
   Fix at source, not in the trim. Also **2 lines / 5s max** — the voice drifts inside longer takes.
2. **The expression must be in the STILL** — Kling will not put a face on that the frame lacks.
3. **...and the prompt must not fight it.** Banning the smile in the prompt produced a grave
   Evelyn. Needed BOTH a warm frame AND "HOLD THE WARMTH ALREADY IN THE FIRST FRAME". The voice
   descriptor's "no smile in the voice" also made her sound cold — v2 says "there is real warmth
   in it... never cold, clipped or severe".
4. **⭐ A CLEAN STATIC STILL ANIMATES BETTER THAN A MID-MOTION ONE.** Tested 3 ways: a squared,
   dead-still deck asking Kling to BEGIN shuffling beat both mid-riffle and mid-overhand stills.
   The mid-motion frames lost their cards (deck evaporates, pattern smears) because a frozen blur
   gives the model nothing solid to work from. **This inverts the "render the after state" rule**:
   that rule is about not leaving implied action in a still you want to stay STATIC.
5. **Nothing mid-action in a still you want still.** The card insert was rejected because the
   IMAGE prompt said a card was "slightly lifted at one corner" — the model finished the gesture.
6. **`--out-dir` resolves relative to the CONFIG file**, not the cwd. Pass an absolute path.
7. **Validated across every render:** identity holds even under hand motion; warmth holds to the
   last frame once the prompt stops fighting it; the **eyes-up beat works every time**.
8. **No stray figures in wide shots** — contradicts the baby-caboose "open floor gets an adult"
   finding. Probably because this room is small and furnished rather than open carpet.
9. **⛔ Religious objects appear unprompted.** The full-body still came back with Buddha figures.
   The bible calls a stray cross a BLOCKING defect; same rule, different religion. The negative
   must be stated POSITIVELY inside the visual description — a trailing avoid-list does not work.

## Cut-stage rules
Inserts silent (cheaper, and a voice over a still life produces gibberish) · captions = phrase
chunks 2-5 words at **y 0.76**, Montserrat ExtraBold, white + black outline, never word-by-word ·
**one static gain pass to -2.0 dBFS peak, never loudnorm** (it inflates the silences, and the
silences are the performance) · `-movflags +faststart` or QuickTime may refuse the file ·
8% punch-in as a fixed crop gives a free second angle and hides the jump cut ·
**download every render inside 24h**.

## Cost
~190 credits per finished 15s ad. **Ultra is prepaid at $127/month, so the marginal cost of a
render is ZERO** — the credit figure is only a budget rate (a month buys ~135 ads).
⚠️ Two Ultra accounts seen: **120411553** and **122643397**. If both are live subs that is
$254/mo, which matters far more than render counts. Unverified — check billing.

---

## Generation IDs — re-pull renders from here (24h URL window)

Account **122643397** unless noted.

| Clip | Line | generationId |
|---|---|---|
| warm_S1 | "Three cards went down in front of you." | `AXCHCdVftYV6W9_y-dhKAtbk9QQW21r89LQaUJbHjR1flrLLj0ttA71fdZ9hS4A4edx7LKe5` |
| warm_S1b | "You turned one." | `AXjUhZ1SVmJsa1CD2jGKfxQ-ATk5GS9ClybHgZtmUc2ICkZqoHQOiNR7WG7F8mIx8spHlP4n` |
| warm_S3 | "I turned those two myself." | `AaIyp7AeVZDhan6M93Kb3M5eKP0rjvIvOPdc21aneYPOY4C1EHsW5u7NysP2nT9dw2OPAYxN` |
| warm_S4 | "Tell me your first name and I'll show you." | `AbBq8Tt3Svx4UpS3DUntZ8_yAnBjRzOlAkPyQkt6rL00lZSaWvNUt672eR_PvpWQkMq8pyXI` |
| act_riffle | silent shuffle hook (USED) | `Ac4HTW_4UEH9Ohnwe1y3FfsIS9hO1uS98PVSi8tOtQXhfkV25fy-NLR29DxxiCfIDC3vmzes` |
| act_overhand | silent, cards vanish | `AZdMNYp0g0spbdQjSiWAxk1Qtpw96J4aX0v84kk4TzJpNCeXxlJp-degWDc9ntt17YOysd3Q` |
| act_static | silent, BEST shuffle | `AWY64tMrziLeWCscS_0UkEJG6JuLGwCjupwJY18qrvWJ5ncV_3iYb7xCWxXJHEwY6dEt2dME` |
| shotC_armA | "I turned those two myself." (grave) | `AZQe2VriqIZDEKBYHrRHspy47IKyKnpRExjvCXyTOTGUOJAYnqpQnTqxSjHNi-j87JXjqy9V` |
| S4_close | (grave) | `Ae55vMQJchVRjl9_vNw4LW8jT_5ZnHOSgwzm9lMgg5KGATVZKakFOI3pd-akV6EArJzH0HPB` |
| S3_armB | "The card you turned can name it but not mend it." | `AbZPEJ-hMfMWm4VjZxbx2LDeQ9-ymIk4GDuI33bbM9ukau5WA87ptgq0J3LY_d2CSgSQII15` |
| S3_armC | "A card on its own can mean two opposite things." | `AesXFOyaKVBlZ3y4MgFukl98m4uJwMBAhQxVpxvbbg1LtLh36frddfOGSxXzpBG-dT2Uduz4` |
| shotB_cards | card insert — REJECT, cards lifted | `AeBh6SrLFw4hoHwOTcsH7eKH3EqajcVBliC0DOWTRgswvXm0u05NsUaOLNYCqk7tej9uUG00` |
| probe_01 | acct **120411553** | `AcJ8KFx7RiNV1opNqpMMQ4wr6H7ufudhSSj68xJmenzMa9ihJ-97oqG18ks77dNjd9aN3XjG` |
| probe_02 | acct **120411553** | `AYHBRdigt0km4nCPtMu7XwvdhCIPpXgOZ5JKgmonQdej_jIKX0xiJgue4aqL8NJFyPaFebE4` |

## Stills to regenerate (free, via codex exec)
All lost in the wipe. Prompts are in the session transcript. Priority:
`shots_framing/scene_04` (high angle, three cards + her face — **the best frame of the session**),
`scene_03` (hands forward), `shots_warm/scene_01` + `scene_03` (used in the finished ad),
`shots_action/scene_01-03` (shuffle stills), `shots_cards/scene_01` (the insert).
