# V1 Question Mining — what people actually ask Evelyn (for FB ad angles)

**Source:** read-only analysis of the `conversations` table — **63,090 conversations, 2026-01-29 → 06-30**, 10,392 purchases (16.5% overall). Goal: find which questions resonate, to expand the FB ad angles beyond the 3 proven hooks (`already-met`, `soulmate-timing`, `love-again`).

## Headline finding
**The 3 current hooks all target the *self's abstract love future* ("will I find / when / will I again") — which is the highest-volume but *lowest-converting* and most tire-kicker-laden segment.** The data points hard at a different family of angles: **"read the specific person already on her mind"** — the ex, his real feelings, his honesty, stay-or-go. Those convert meaningfully better *within the same love funnel.*

## The numbers

**By bucket (n / conv%):**
| Bucket | n | conv% |
|---|---:|---:|
| love | 37,806 | **14.0%** |
| money | 12,105 | 19.3% |
| purpose | 8,387 | 19.7% |
| someone (a specific person) | 4,792 | **23.0%** |

Love is 60% of volume but the **worst-converting** bucket; "someone specific" is the **best**.

**Within love — sub-question distribution (n / conv%):**
| Sub-question | n | conv% | Maps to |
|---|---:|---:|---|
| SEEKING_LOVE (find/meet/when) | 15,552 | **14.7%** | the 3 current hooks |
| RELATIONSHIP_TROUBLE (stay-or-go) | 8,428 | 17.8% | — *untapped* |
| LOST_LOVE (ex / love again) | 5,716 | 18.7% | partly `love-again` |
| BETRAYAL (cheating / honesty) | 1,674 | 17.3% | — *untapped* |
| (unclassified — early bouncers) | 5,818 | 1.2% | — |

**Every person-specific segment (trouble, lost, betrayal) out-converts generic seeking.** This within-love comparison is the clean signal (same funnel, same traffic).

**Keyword themes** (of 32,310 love concerns, n containing / conv%):
- **ex 3,093 (20.6%)** ← biggest concrete theme; + come back/get back 618
- soulmate 2,637 (incl. "the one") · married/marriage 2,275 · "love(s) me" 1,153 · alone 1,066
- lie 800 · divorce 767 · future 787 · trust 527 · cheat 513 · twin flame 202

**The tire-kicker tax:** the most frequent *exact* concerns under seeking are non-answers — "you tell me" (37), "just curious" (35), "not sure", "nothing really", "i don't know" — and they convert at ~0–3%. The soulmate hooks pull volume, but a big slice is low-intent. Person-specific askers self-qualify (they have a real situation).

## Recommended new ad angles (ranked by volume × conversion × emotional charge)

> All are **"read the man already on her mind"** angles. VOC = verbatim customer phrasings → ad-copy starters.

1. **"Will he come back?"** (the ex / reunion) — *largest concrete theme, strong conversion.*
   VOC: "will he come back" · "will my husband and I get back together" · "he just stopped communicating" · "broke up 2.5 yrs ago, still think about him."
2. **"Does he really love me?"** (his hidden feelings) — *huge volume, person-specific.*
   VOC: "does he really love me" · "how serious is he about me" · "he says he loves me but doesn't show up."
3. **"Is he being honest with you?" / "Is he faithful?"** (trust / betrayal) — *fear-driven, high-intent.*
   VOC: "is he being truthful" · "scared my partner isn't faithful" · "I love her but I don't trust her."
4. **"Stay, or walk away?"** (relationship crossroads) — *8.4k volume at 17.8%.*
   VOC: "should I leave my husband or stay" · "dead-end relationship" · "am I married to the wrong person?"

The 3 proven self-future hooks stay (real volume); these 4 expand into higher-intent territory the current angles ignore.

## Caveats (read honestly)
- Conversion-by-segment is **correlational**. The cross-bucket gap (someone 23% vs love 14%) is **confounded by traffic source** — fb-palm is love-seeded; "someone" is non-palm. So don't assume a "someone" ad converts at 23%. The **within-love** comparison (trouble/lost/betrayal > seeking) is the trustworthy signal.
- `sub_bucket` is LLM-labeled — noisy, but directional at this N.
- Survivorship: only people who reached concern-capture are counted (early bouncers underrepresented).

## Recommended next step
Build the **top 2–3 angles as new `/fb-palm` hooks** (`palmReads.ts` headline + per-sign reads + bucket mapping), then test them against the 3 proven hooks on equal spend — judged on hook-rate + CPL + the **v1 purchase rate** they actually drive. Use the VOC lines above as the ad primary-text / headline seeds.

---

# Deep dive — top questions within each segment (frequency × conversion)

**Method:** recurring question *patterns* (word-boundary regex) counted across every concern in the segment, with purchase count, conversion %, and **lift** vs that segment's own baseline. Patterns are **non-exclusive** (a concern can hit several). **Matched %** = share of the segment hitting ≥1 pattern — the rest are open-ended narratives, so read these as the *legible* questions, not the whole segment. `n` = concerns matching; conv% = purchased ÷ n.

### love / SEEKING_LOVE — 15,543 concerns · baseline 14.7% · matched 32%
| Question | n | conv% | lift |
|---|---:|---:|---:|
| Soulmate (generic) | 1,776 | 14.9% | 1.01× |
| Will I be alone / I'm lonely | 1,595 | 16.9% | 1.15× |
| Will I find / meet love? | 826 | 15.9% | 1.08× |
| Tired of searching / given up | 470 | 17.2% | 1.17× |
| Is [this person] the one? | 324 | 15.4% | 1.05× |
| **When will I meet them?** | 318 | **10.7%** | **0.73×** |
| Will I love again (later in life)? | 285 | 16.8% | 1.15× |
| Will I ever find love? | 259 | 13.5% | 0.92× |
| **Have I already met them?** | 147 | **7.5%** | **0.51×** |
| **Who is my soulmate?** | 77 | **6.5%** | **0.44×** |

### love / RELATIONSHIP_TROUBLE — 8,433 · baseline 17.8% · matched 25%
| Question | n | conv% | lift |
|---|---:|---:|---:|
| Is he the right one / my soulmate? | 702 | 16.1% | 0.90× |
| **Will we make it / work out?** | 320 | **23.8%** | **1.34×** |
| **Will he commit / propose / marry?** | 301 | **21.9%** | **1.23×** |
| Why is he distant / pulling away? | 291 | 18.2% | 1.02× |
| Does he really love / want me? | 243 | 15.2% | 0.86× |
| Should I stay or leave? | 206 | 17.0% | 0.96× |
| **Is he cheating / can I trust him?** | 186 | **21.5%** | **1.21×** |
| Where is this relationship going? | 121 | 19.0% | 1.07× |

### love / LOST_LOVE — 5,716 · baseline 18.8% · matched 42%
| Question | n | conv% | lift |
|---|---:|---:|---:|
| Will he come back? | 601 | 18.1% | 0.97× |
| **Why did he leave / ghost me?** | 521 | **20.9%** | **1.12×** |
| Is my ex my soulmate / the one? | 441 | 18.8% | 1.00× |
| Should I move on / let go? | 350 | 14.6% | 0.78× |
| I miss him / can't stop thinking | 321 | 20.6% | 1.10× |
| Will we get back together? | 288 | 20.8% | 1.11× |
| Does he still love / think of me? | 233 | 19.3% | 1.03× |
| **Will I find closure?** | 184 | **22.3%** | **1.19×** |

### love / BETRAYAL — 1,674 · baseline 17.3% · matched 62%
| Question | n | conv% | lift |
|---|---:|---:|---:|
| Is he cheating / faithful? | 490 | 17.8% | 1.03× |
| Is he lying / telling the truth? | 282 | 18.1% | 1.05× |
| Is there someone else? | 159 | 17.6% | 1.02× |
| Can I trust him? | 151 | 13.9% | 0.81× |
| Is he hiding a secret? | 91 | 20.9% | 1.21× |
| **Will he hurt / betray me again?** | 57 | **28.1%** | **1.63×** ⚠️ |
| **Should I stay after this?** | 25 | **32.0%** | **1.85×** ⚠️ |

### someone / THEIR_FEELINGS — 1,179 · baseline 22.9% · matched 25%
| Question | n | conv% | lift |
|---|---:|---:|---:|
| Is he the one / meant for me? | 98 | 28.6% | 1.25× |
| What is our future? | 81 | 27.2% | 1.19× |
| Does he love / like me? | 55 | 14.5% | 0.64× |
| How does he really feel about me? | 36 | 25.0% | 1.09× |
| Does he think about me? | 24 | 20.8% | 0.91× |
| Is he serious / interested? | 20 | 40.0% | 1.75× ⚠️ |

### someone / REUNION — 740 · baseline 24.2% · matched 24% (small n — directional)
| Question | n | conv% | lift |
|---|---:|---:|---:|
| Will he come back / return? | 63 | 31.7% | 1.31× |
| Will we get back together? | 49 | 30.6% | 1.27× |
| Should I move on instead? | 24 | 41.7% | 1.72× ⚠️ |
| Does he still love me? | 19 | 47.4% | 1.96× ⚠️ |
| Is there still a chance for us? | 14 | 42.9% | 1.77× ⚠️ |
| Does he want me back? | 13 | 46.2% | 1.91× ⚠️ |

### someone / TRUST_TRUTH — 1,131 · baseline 26.6% (highest of all) · matched 34%
| Question | n | conv% | lift |
|---|---:|---:|---:|
| Is there someone else? | 111 | 26.1% | 0.98× |
| Is he telling the truth / honest? | 105 | 31.4% | 1.18× |
| Can I trust him / his intentions? | 82 | 23.2% | 0.87× |
| Is he genuine / serious about me? | 67 | 34.3% | 1.29× |
| **Is he a scammer / real person?** | 43 | **44.2%** | **1.66×** |
| Is he playing me / is this a game? | 38 | 21.1% | 0.79× |
| Is he hiding something? | 26 | 30.8% | 1.16× |

## What the depth changes

1. **Your current hooks are phrased the worst-converting way.** Within seeking, the literal current angles bottom out: *"Who is my soulmate?"* 6.5%, *"Have I already met them?"* 7.5%, *"When will I meet them?"* 10.7% — all **well below** the 14.7% baseline. The *same seeking audience* converts 15–17% when framed as **pain/identity** instead of curiosity: *"tired of searching"* 17.2%, *"afraid I'll be alone"* 16.9%, *"will I love again at this stage"* 16.8%. (Of the 3 live hooks, only `love-again` is well-aimed; `already-met` and `soulmate-timing` are the weak framings.)
2. **The conversion ladder is consistent:** abstract future (~14%) → a specific struggling/lost relationship (~20–24%) → **decode a specific man's truth/intentions** (~31–44%). The more the question is "read *this* man for me," the more it buys.
3. **Soft "does he love me?" underperforms** in every segment it appears (THEIR_FEELINGS 14.5%, TROUBLE 15.2%). People pay to resolve **fear and high-stakes uncertainty**, not to confirm affection.
4. **Highest-converting angles with real volume:** *"Will we make it / will he finally commit?"* (trouble, ~22–24%), *"Why did he ghost me / will I get closure?"* (lost love, ~21–22%), *"Is he telling me the truth / is he genuine?"* (~31–34%), and the standout *"Is he a scammer / real?"* (44%, online-romance fear).

## Revised angle priorities (supersedes the earlier 4)
1. **Re-phrase the existing seeking hooks** from curiosity → pain ("Tired of waiting for love?" / "Afraid you'll be alone?") — cheapest win, same audience, +3–6pts.
2. **"Why did he ghost you — and will he come back?"** (lost love; big volume, ~21%).
3. **"Is he telling you the truth?" / "Is he really who he says?"** (trust/truth + scam fear; highest conversion).
4. **"Will your relationship survive — or is he never going to commit?"** (trouble; ~22–24%).

## Caveats (deep pass)
- **Low match rates** (24–42%, except betrayal 62%): patterns capture the legible questions, not every concern. Relative signal is sound; absolute volumes undercount.
- **⚠️ = thin n** (<60): high lift but noisy — treat as hypotheses to test, not facts.
- These conversions are **by typed concern, not by ad hook** (the hook param isn't persisted on `conversations`). So this shows which *questions buyers hold* — a strong proxy for angle quality, but not a direct ad-hook A/B. The hook test still has to happen live.
- Patterns non-exclusive; same survivorship + correlational caveats as above.
