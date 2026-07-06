# FB-Palm Headline-Test Roadmap (buckets-first)

The master backlog of question-hooks to test. Built **buckets-first**: rank the data's own categories (LLM `sub_bucket`) by frequency × conversion, then let the questions **surface from inside each bucket** (recurring phrase frequency), then sequence into waves. All headlines are **RAW** (no safespeak — see `fb-ad-headlines-raw` + the skill spec). This supersedes the earlier regex-pattern version.

## Methods — slices you can run anytime
All **read-only**, run at repo root, refresh from live data each call: `node fb-palm/ledger/mine-questions.cjs <method>`.

| Method | Answers | Invoke |
|---|---|---|
| `overview` | Quick health check — totals, bucket split, love sub-bucket conv% | `… overview` |
| `buckets` | **Level 1** — buckets ranked by frequency × conversion (buyers = n × conv) | `… buckets` |
| `phrases` | **Level 2** — recurring questions surfacing inside a bucket (n-grams, no imposed patterns) | `… phrases <bucket> <sub>` |
| `voc` | Verbatim customer concerns (voice-of-customer copy) | `… voc <bucket> <sub> [n]` |
| `roadmap` | All question patterns ranked by frequency × conversion (flat list) | `… roadmap` |
| `deep` | Per-segment question patterns with conv% + lift (detail behind the buckets) | `… deep` |
| `revenue` | **ROAS lens** — buckets by expected value per visitor ($/click, main + upsells) | `… revenue` |
| `momentum` | **Direction** — demand-share + conversion trend by month (current month auto-excluded) | `… momentum` |

Buckets: `love` / `someone`. Sub-buckets: `SEEKING_LOVE` · `RELATIONSHIP_TROUBLE` · `LOST_LOVE` · `BETRAYAL` · `TRUST_TRUTH` · `THEIR_FEELINGS` · `REUNION` (run `buckets` to list with counts).

**Planned (not built yet):** `friction` (`objection_count` per question — cheapest-to-convert angles) · `price-tolerance` (`price_variant` interaction — which angles buy at the higher price).

The three lenses this roadmap triangulates: **buyers** (reach) · **revenue** (ROAS) · **momentum** (direction).

---

## Level 1 — buckets ranked by frequency × conversion (= buyers)

| Buyers | n | conv% | Bucket | Sign family |
|---:|---:|---:|---|---|
| **2,297** | 15,630 | 14.7% | love / SEEKING_LOVE | self-frame `[thumb]` |
| **1,505** | 8,459 | 17.8% | love / RELATIONSHIP_TROUBLE | self-frame `[thumb]` |
| **1,076** | 5,740 | 18.7% | love / LOST_LOVE | self-frame `[thumb]` |
| 301 | 1,132 | **26.6%** | someone / TRUST_TRUTH | decode-him `[card]` |
| 290 | 1,678 | 17.3% | love / BETRAYAL | decode-him `[card]` |
| 270 | 1,182 | **22.8%** | someone / THEIR_FEELINGS | decode-him `[card]` |
| 179 | 741 | **24.2%** | someone / REUNION | decode-him `[card]` |

**The shape of it:** buyer volume is overwhelmingly in the three **self-frame love buckets** (SEEKING 2,297 + TROUBLE 1,505 + LOST 1,076). The four **decode-him buckets convert better per head (22–27%) but are a small pool (~1,040 buyers combined)** and need the card device. So: big self-frame buckets first (buildable now), decode-him as the high-efficiency secondary.

`[thumb]` = runs on the existing self-palmistry quiz (hand reads *her*). `[card]` = the rawest about-him form. **Strategy: test decode-him on the existing thumb signs FIRST** — raw about-him headline + a bridging reveal (her intuition / heart-line "reads" him). Build the card device **only if the thumb test underperforms**, so we never lose a proven mechanism on an unproven bet. See `hook-pipeline.md` §Self-frame rule.

---

## Level 2 — questions that surfaced inside each bucket
*(recurring phrase counts, pulled from the text — not imposed patterns)*

**SEEKING_LOVE** (2,297 buyers · 14.7%)
- "Will I meet/find my soulmate?" — *meet my soulmate* 209 · *find my soulmate* 115 ← **already live** (skip)
- **"Tired of being single / alone?"** — *tired of being* 129 · *been single* 46 ← fresh
- "Will I find true love / someone to share my life?" — *find true love* 107 · *someone to share my life* 86

**RELATIONSHIP_TROUBLE** (1,505 · 17.8%)
- **"He says he loves me — but doesn't show it"** — *he says he* 101 · *says he loves* 43 · *but he* 490
- **"Am I wasting my time?"** — *wasting my time* 49
- **"Is he the one?"** — *he the one* 61 · *the one* 276

**LOST_LOVE** (1,076 · 18.7%)
- **"Will he come back / will we get back together?"** — *my ex* 997 · *come back* 327 · *back together* 199
- **"I still love him / can't stop thinking about him"** — *still in love* 51 · *miss my ex* 46
- "Should I move on?" — *move on* 223

**BETRAYAL** (290 · 17.3%) · decode-him — "Is he cheating?" (*cheating on* 116) · "Is there someone else?" (*someone else* 82 · *behind my back* 20) · "Is he lying / who he says?" (*who he says* 20 · *hiding something* 15)
**TRUST_TRUTH** (301 · 26.6%) · decode-him — "Is he who he says he is?" (*who he says* 10) · "Am I wasting my time?" (*wasting my time* 15) · "Does he really love me?" (*he really love* 7)
**THEIR_FEELINGS** (270 · 22.8%) · decode-him — "How does he really feel? Does he feel the same?" (*does he* 84 · *feels the same* 10) · "Is he the one?" (*he my soulmate* 13)
**REUNION** (179 · 24.2%) · decode-him — "Will we get back together?" (*back together* 32) · "He's gone silent — will I hear from him?" (*haven't heard from* 7)

---

## Waves (priority = bucket buyers × mechanic-readiness)

### Wave 1 — self-frame, runs on existing thumb signs NOW (biggest buyer pools)
| Raw headline | Hook | Bucket → surfaced question | Buyers | conv% |
|---|---|---|---:|---:|
| **Are you wasting your time on him?** / *Is he ever going to commit?* | `heart-safe` | TROUBLE → wasting my time / he says he loves me but | ~1,505¹ | 17.8% |
| **Why can't you let him go?** | `why-him` | LOST → my ex / still love him / can't stop | ~1,076¹ | 18.7% |
| **Are you done being alone?** / *Tired of waiting for love?* | `done-alone` / `tired-waiting` | SEEKING → tired of being single | fresh slice | ~17% |
| **Is he really the one — or are you settling?** | `right-one` | TROUBLE/SEEKING → is he the one | — | mixed |

¹ bucket-level pool; a single headline captures a slice of it (the surfaced question), not all of it.

### Wave 2 — decode-him, test on EXISTING thumb signs first (card device only if it underperforms)
| Raw headline | Hook | Bucket | conv% |
|---|---|---|---:|
| **Is he cheating on you?** | `is-he-cheating` (new) | BETRAYAL | 17.3% |
| **Is he who he says he is?** / *Is he playing you?* | `is-he-true` | TRUST_TRUTH | 26.6% |
| **How does he really feel about you?** | `how-he-feels` (new) | THEIR_FEELINGS | 22.8% |
| **Is he coming back?** | `door-open` (card form) | REUNION | 24.2% |

**Test design (thumb-first, "I"-perspective):** reframe each decode-him question to **first-person "I"** — raw, matches the proven register (*"Will I love again?"*), and keeps *her* the grammatical subject so the thumb reveal coheres with no card device:
- *"Is he lying to you?"* → **"Am I being lied to?"** · *"Is he playing you?"* → **"Am I being played?"** · *"Is he cheating?"* → **"Am I being cheated on?"** · *"Is he the one?"* → **"Am I settling?"** · *"Is he coming back?"* → **"Is it over for me?"**

**Intent-layer A/B (run two headlines per question, let FB pick):**
- **Open** (broad, lower-intent): *"Am I being X'd?"* — catches anyone with a flicker of doubt.
- **Presupposed** (narrow, high-intent + instant "she sees me" validation, tightest thumb-coherence): *"Why do I feel like he's X-ing?"* — only the already-suspicious, but the reveal *explains her intuition* (answers the "why" off her own palm). Use **"feel"** (VOC) over "sense."

Build the card device only if the "I"-on-thumb test underperforms the self-frame love hooks.

**Drafted & at the review gate (thumb · deception angle · the first decode-him test):**
| Hook | Headline | Layer |
|---|---|---|
| `is-he-true` | "Am I being lied to?" | open |
| `sense-lying` | "Why do I feel like he's lying to me?" | presupposed |

Reveal guardrail (both): beat 3 affirms **her intuition as a real instrument**, never a verdict that he's lying (empowerment, not paranoia). Same thumb art, two headlines baked on → two message-matched landers → FB rotates and spends into the winner.

---

## Decode-him CARD funnel (full spec: `decode-him-card-funnel.md`)
The high-ROAS, rising decode-him buckets read best with a **new `cards` sign** that reads *him* (a divination pull) — unlocking the fully-raw about-him headlines the thumb can't carry. It's a new SignConfig (card art + him-reading reads + "think of him" instruction), reusing the whole bridge→chat→monetization. The matrix is **block-diagonal**: self-frame hooks × palm signs · decode-him hooks × the `cards` sign.

**Batch 1 — 4 hooks, one per decode-him bucket (find the winning territory):**
| Hook | Headline (raw, about-him) | Bucket | EV/visit | Role |
|---|---|---|---:|---|
| `cards-honest` | Is he being honest with you? | TRUST_TRUTH | **$12.45** | best ROAS — lead-weight |
| `cards-return` | Will he come back? | REUNION | $11.46 | classic card pull |
| `cards-feels` | How does he really feel about you? | THEIR_FEELINGS | $10.70 | safest, card-native |
| `cards-cheating` | Is he cheating on you? | BETRAYAL | $7.80 | visceral / momentum wildcard |

Honest split: the `someone/*` trio = ROAS plays; **"Is he cheating?" wins CTR/momentum but is *lowest* EV** ($7.80) — keep it as the wildcard, not the lead. `someone/*` EV is cross-bucket-confounded → test, don't bank. Card archetypes: **Sun (in the light) · Moon (veiled) · Tower (shifting)**. Reveal guardrail: **tendency, never a verdict** ("the Moon means something's unsaid, not that he's lying"). Sequence: batch 1 angles → scale winner → batch 2 = intent-layer A/B inside it.

---

## Caveats
- Conversion is correlational; `someone/*` lifts are cross-bucket-confounded (not palm traffic) — trust within-`love` comparisons most.
- Phrase counts surface the *legible* recurring language; long narratives don't all reduce to a phrase, so counts undercount true theme size.
- "Buyers" ranks by typed concern, not by ad hook — a strong proxy; the live hook test is the proof.

## Second lens — expected value per visitor (ROAS), via `mine-questions.cjs revenue`
Frequency × conversion (buyers) is **volume-biased**. The ROAS lens — **$ per visitor** (main + upsells ÷ visitors) — **reverses the order**:

| Bucket | Buyers rank | EV/visit | conv% |
|---|---|---:|---:|
| someone / TRUST_TRUTH | #4 | **$12.45** | 26.6% |
| someone / REUNION | #7 | $11.46 | 24.2% |
| someone / THEIR_FEELINGS | #6 | $10.70 | 22.8% |
| love / LOST_LOVE | #3 | $8.65 | 18.7% |
| love / RELATIONSHIP_TROUBLE | #2 | $8.04 | 17.8% |
| love / SEEKING_LOVE | **#1** | **$6.88** | 14.7% |

**AOV is flat (~$45–52) across all buckets** → EV is driven by conversion, not basket size. Since paid ads pay per *click*, EV/visit (≈ ROAS) is the more decision-relevant metric than total buyers. Read: **SEEKING = cheap reach but worst ROAS (volume trap); LOST/TROUBLE = reach + value (safest); decode-him = scarce but ~2× ROAS (the upside play, worth the card device).** Caveat: `someone/*` EV is cross-bucket-confounded — test, don't bank.

## Third lens — momentum (direction), via `mine-questions.cjs momentum`
Demand-share trend, Feb+Mar → Apr+May (the current month is auto-excluded — conversions/classification lag). The reliable signal is **Δ demand-share**:

| Bucket | Δ share | |
|---|---:|---|
| RELATIONSHIP_TROUBLE | **+3.2pp** | ▲ rising fastest |
| BETRAYAL | +2.1pp | ▲▲ rising (+conv too) |
| TRUST_TRUTH | +1.9pp | ▲ rising |
| LOST_LOVE | −1.4pp | ▼ softening |
| SEEKING_LOVE | **−6.1pp** | ▼ falling fastest |

## Triangulation — all three lenses (the decision)
| Bucket | Reach | ROAS (EV) | Momentum | Verdict |
|---|---|---|:---:|---|
| **RELATIONSHIP_TROUBLE** | big | $8.04 | ▲+3.2 | **#1 all-round — lead here (`heart-safe`)** |
| SEEKING_LOVE | huge | worst $6.88 | ▼−6.1 | declining volume trap — milk, don't invest |
| LOST_LOVE | big | $8.65 | ▼−1.4 | softening (`why-him` — keep, watch) |
| TRUST_TRUTH | small | best $12.45 | ▲+1.9 | high-value + rising → **build card device** |
| BETRAYAL | small | $7.80 | ▲▲+2.1 | rising on both — decode-him growth |

**Net:** lead with `heart-safe` (TROUBLE: big + rising); keep `why-him`/`done-alone` but know LOST/SEEKING are softening; the decode-him card device is where ROAS *and* growth converge, so it's a real investment, not a side bet.

**Remaining slices to build:** *friction* (`objection_count` per question — cheap-to-convert angles), *price-tolerance* (`price_variant` interaction — which questions buy at higher prices).
