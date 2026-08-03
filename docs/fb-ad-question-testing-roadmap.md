# FB Ad Question Testing Roadmap — Q3 2026 (3 months)

## Summary

Source: `conversations` table (78,012 rows, all-time through 2026-07-28), mined via
`fb-palm/ledger/mine-questions.cjs`. Full derivation + sub-meta rollups in memory
`fb-ad-question-conversion-ladder`. **72 headlines across all 6 sub-groups are done**,
each as 3-5 main-concern clusters × 3 phrasing variants (direct / intensified-or-plea /
tension-framed), built directly from reading ~100 real buyer `concern` quotes per
sub-group — not led by statistical n-gram mining (tried once, corrected; see memory
`feedback-voc-first-headline-method`).

**Scope note:** this doc is primarily about WHICH QUESTIONS to test and in what
sequence — delivery mechanism (plain ad→chat, palm-sign quiz, card pull, or anything
else) is generally worked out separately. **Exception, starting with sub-group 7
below:** where a question set has a specific, already-decided mechanism (e.g. a tarot
card-pull), the mechanism spec is included inline going forward, so the headline set
and its lander build spec don't drift out of sync.

**What the conv% numbers can and can't tell you:** they measure question → purchase
conversion for people already mid-chat asking that question — NOT ad click-through rate
or lead quality. A question that converts great once someone's engaged might make a
mediocre cold-traffic hook, or vice versa. Wave 1 (below) exists specifically to test
whether this pattern transfers to the ad layer.

**Extraction method:**
1. Filter for volume — dropped anything under n=150 from the primary list; smaller
   high-converting ones kept as a "longshots" pool for later waves.
2. Excluded current live incumbents ("Who is my soulmate?", "Have I already met them?",
   "When will I meet them?") — those are the control baseline, not new tests.
3. Ranked within each sub-group by conv%, not raw buyer count.
4. Compliance-flagged anything scam/catfish-adjacent (cross-ref `docs/fb-compliance-catalog`).

**The 6 sub-groups, ranked, and the order they were worked in** (Trust/honesty was
picked first by the operator, out of rank order; the rest followed rank):

| Order | Sub-group | n | conv% | Meta | Headlines |
|---|---|---|---|---|---|
| 1 | Trust/honesty | 2,289 | 20.1% | decode-him | 12 |
| 2 | Feelings/commitment | 3,167 | 19.5% | decode-him | 15 |
| 3 | Reunion/return | 2,345 | 21.0% | decode-him | 15 |
| 4 | Healing/moving-on | 1,126 | 20.2% | self-identity | 12 |
| 5 | Soulmate/destiny | 2,935 | 15.1% | self-identity | 9 |
| 6 | Loneliness/timing | 5,122 | 15.1% | self-identity | 9 |

Top 4 by conv% are statistically close (19.5–21%) — no single sub-group dominates
enough to bet the whole roadmap on one. Bottom 2 are exactly the current live ad axis,
and structurally have less new (non-incumbent) territory to draw from.

**Two cross-cutting flags surfaced while building the sets below — read before running
anything:**
- **Bereavement**, confirmed independently across 3 of 6 sub-groups (Healing/moving-on,
  Soulmate/destiny, Loneliness/timing, ~10-15% of each VOC pull) — an actual dead
  spouse/partner, not a breakup. More vulnerable audience than ordinary heartbreak.
  Flagged headlines that could target it are called out individually below and need a
  deliberate decision, not default inclusion. See memory `fb-ad-bereavement-crosscut`.
- **"Cheating"/"cheat"/"affair"/"unfaithful" are excluded from the trust/honesty set.**
  Not a hard Meta policy ban (checked directly: the "Dating Ads" rule bans facilitating
  affairs, not asking about suspected infidelity), but ad review in practice
  pattern-matches this vocabulary as personal-attribute/sensational content — a
  known-risky word set in this vertical regardless of the letter of the policy. Every
  trust/honesty headline avoids it via self-frame "I" phrasing or a VOC-native indirect
  term instead.
- Separately, in Loneliness/timing, several quotes tie loneliness to disability/health
  ("I have MS," "I'm disabled") — don't build a headline around that; it's a
  health-condition-implying personal attribute Meta's policy explicitly restricts.

---

## Wave 1 (Weeks 1–3) — Axis discovery

One clean representative per sub-group, run head-to-head against the current live
control ads. Goal: confirm which axis (or axes) actually wins on real ad metrics
(CTR, cost/lead, cost/purchase), not just chat-conversion.

- [ ] **Trust/honesty** — see the 12-headline set below
- [ ] **Feelings/commitment** — see the 15-headline set below
- [ ] **Reunion/return** — see the 15-headline set below
- [ ] **Healing/moving-on** — see the 12-headline set below
- [ ] **Soulmate/destiny** — see the 9-headline set below
- [ ] **Loneliness/timing** — see the 9-headline set below
- [ ] **Curse/Bad-luck (tarot mechanism)** — see the 12-headline set below. ⚠ Different
      sourcing than sub-groups 1-6: built from external Reddit VOC + hypothesis, NOT
      ranked by internal conv% (the `conversations` table is selection-biased toward
      whoever the *current* ad targeting already recruited — see memory
      `fb-ad-question-conversion-ladder` discussion). Treat as a true unranked Wave 1
      axis-discovery test, not a pre-validated pick.
- [ ] **Twin-Flame Runner/Chaser (tarot mechanism)** — see the 12-headline set below.
      Same sourcing caveat as Curse/Bad-luck — external Reddit VOC, unranked hypothesis.
- [ ] Control: keep current live ads running unchanged as baseline
- [ ] Read: CTR + cost/lead + cost/purchase per headline, not just conv% inside chat

**Decision gate:** do the axes that win on chat-conv% (reunion/trust/feelings/healing)
also win on ad CTR and cost/purchase? If yes → proceed to Wave 2 as planned. If a
"weak" axis (loneliness/soulmate) actually wins on CTR despite lower chat-conv%, that
means hook strength and conversation quality are decoupled — worth a note back to
memory either way.

---

## 1. Trust/Honesty

Operator picked this to start. Confidence tags = how directly each phrase was found in
the 200 buyer-concern VOC pull (not just a paraphrase I constructed).

**Is he real / genuine**
- [ ] "Is he really who he says he is?" — *HIGH: near-verbatim 3× across the VOC pull*
- [ ] "Is he the real person, or just a picture?" — *MED-HIGH: VOC "the person behind the picture I see"*
- [ ] "Am I being misled?" — *MED: VOC "am I being miss lead"*

**Honesty / lying**
- [ ] "Am I being lied to?" — *HIGH: matches the already-wired `is-he-true` hook + natural self-frame construction in VOC*
- [ ] "Is he telling me the truth?" — *HIGH: VOC "he is not telling me the truth" + matches the named question pattern (n=110, 30.9% conv)*
- [ ] "Am I being deceived?" — *MED: VOC "I feel I'm being deceived"*

**Fidelity, without the flagged word**
- [ ] "Is there someone else?" — *HIGH: one of the most-repeated phrases in the whole pull (n=141 as a 2-gram)*
- [ ] "Is he talking to someone else?" — *MED-HIGH: recurs across multiple quotes*
- [ ] "Is he being faithful to me?" — *HIGH: VOC "I want to know if my fiancé is been faithful, true and honest with me"*
- [ ] "Is he loyal to only me?" — *LOWER: wording variant, not directly VOC-sourced — included for phrasing spread*

**Hidden / intuition**
- [ ] "Is he hiding something from me?" — *HIGH: "hiding something" recurs constantly (n=42 as a 2-gram)*
- [ ] "Something feels off — is my intuition right?" — *MED-HIGH: VOC "something feels off" / "my intuition tells me"*

12 headlines. Suggest launching all 12 rather than pre-picking a favorite; Wave 1's job
is to find out which territory (identity, honesty, fidelity, intuition) wins before
narrowing.

## 2. Feelings/Commitment

Pulled from `love/RELATIONSHIP_TROUBLE` (excluding the "is he cheating/can I trust him"
slice already covered under trust-honesty) + `someone/THEIR_FEELINGS` in full. 2,864
matching concerns, 548 purchased. 100 verbatim buyer quotes read directly.

Notable: **soulmate/twin-flame crossover language showed up in ~15 of the 100 quotes** —
even more prominent here than in reunion-return (~5%). This is the first of three
sub-groups in a row where "is he my soulmate" bleeds in regardless of the actual
underlying question.

**Will he commit**
- [ ] "Will he ever commit?" — *HIGH: direct, matches named-question data (n=398, 24.1%)*
- [ ] "Why won't he commit to me?" — *HIGH: matches "what am I doing wrong to make him not commit"*
- [ ] "Is he ever going to be ready for real commitment?" — *MED: patience/doubt variant, matches "afraid of commitment because of his past"*

**Is he pulling away**
- [ ] "Why is he pulling away from me?" — *HIGH: one of the most repeated phrasings in the pull*
- [ ] "Why has he gone cold on me?" — *MED-HIGH: matches "turned cold," "hot and cold"*
- [ ] "Is he losing interest, or just going through something?" — *MED: charitable-doubt tension variant, matches "distant because of a problem, won't explain"*

**Is he the one**
- [ ] "Is he really the one for me?" — *HIGH: direct, very common phrasing*
- [ ] "Am I with the right person?" — *MED: self-frame variant*
- [ ] "Is he the one, or am I settling?" — *MED: tension variant*

**Does he really feel it**
- [ ] "Does he really love me?" — *HIGH: direct*
- [ ] "How does he really feel about me?" — *HIGH: near-verbatim VOC*
- [ ] "Does he love me, or am I imagining it?" — *MED: doubt-tension variant*

**Soulmate/twin-flame crossover**
- [ ] "Is he really my soulmate?" — *HIGH: most common exact phrasing in this cluster*
- [ ] "Is he my twin flame, or just a strong connection?" — *MED: wording variant, consistent with the same finding in reunion-return*
- [ ] "Have I already met my soulmate without realizing it?" — *MED-HIGH: matches "I have already met my soulmate, in fact..."*

15 headlines. No compliance flags identified for this set.

**Refresh — 2026-07-29 (situationship vocabulary, from external Reddit VOC mining, not
the `conversations` table):** a broad-sweep Reddit scrape surfaced "situationship" /
"define the relationship" (DTR) as heavily-used current vocabulary for the exact same
underlying question as this sub-group's "Will he commit" cluster — real quotes: *"there's
no label... whenever I try to bring up clarity it's always 'why put pressure on it?'"*,
*"Men, if you ever were avoiding to 'define the relationship,' what was the reason?"*.
**Verdict: not new territory** — same driver, newer generational phrasing. Two candidate
phrasing variants to test *within* this existing cluster rather than as a new sub-group:
- [ ] "Are we together, or just... something?" — *MED: synthesizes recurring "no label" / "what are we" framing*
- [ ] "Why won't he just define this?" — *MED-HIGH: near-verbatim, "why won't he... define the relationship"*

No new mechanism needed — same plain ad→chat delivery as the rest of this sub-group.

## 3. Reunion/Return

Pulled from `love/LOST_LOVE` + `someone/REUNION`, filtered to the reunion-flavored half
of each (excludes the self-facing "should I move on / miss him" content that belongs to
healing-moving-on instead). 2,147 matching concerns, 440 purchased, phrase-mined for
Frequency/Value/Momentum, then cross-checked against a 100- and 200-quote VOC read (the
larger sample confirmed the same rankings — see conversation history).

Notable: most of the highest-frequency phrases here ("come back," "back together," "my
ex") are **declining** in share (−4 to −6pp), while "left me," "still love," and
especially **"my soulmate" (+2.0pp — the single highest momentum signal in this set)**
are rising. That soulmate crossover wasn't something I went looking for; the data
surfaced it, and it recurred independently in Feelings/Commitment too.

**Will he come back**
- [ ] "Will he come back?" — *HIGH: most frequent phrase in the filtered set (n=464)*
- [ ] "Will he ever come back to me?" — *HIGH: near-verbatim VOC, intensified/plea form*
- [ ] "Is he coming back, or has he moved on?" — *MED: tension-framed, matches the recurring either/or pattern in the 200-quote check*

**Reunion / back together**
- [ ] "Will we get back together?" — *HIGH: n=274, 23.7% value*
- [ ] "Is there still a chance for us?" — *MED-HIGH: named-question data showed 42.9% conv (thin n), hope-framed*
- [ ] "Is it really over between us?" — *MED: VOC "is it truly over," fear-framed inverse of the above*

**Why he left / ghosting**
- [ ] "Why did he leave without a word?" — *HIGH: "he left" n=91 at 29.7% value, "left me" n=197 rising +1.3pp*
- [ ] "Why did he ghost me?" — *HIGH: matches the strongest-performing named question (n=702, 21.2%), distinct slang from "left," not just a synonym*
- [ ] "Was I not enough for him to stay?" — *LOWER: self-frame stakes variant, constructed, not directly VOC-quoted*

**Does he still feel it**
- [ ] "Does he still think about me?" — *HIGH: n=145, rising +1.0pp*
- [ ] "Does he still love me?" — *HIGH: direct alternate to the above*
- [ ] "Does he still love me, or has he moved on?" — *MED: tension-framed combination of the two*

**Soulmate / twin-flame crossover**
- [ ] "Is my soulmate coming back to me?" — *MED-HIGH: VOC near-verbatim + highest momentum signal in the set*
- [ ] "Is my twin flame coming back to me?" — *MED: wording variant confirmed in the 200-quote check ("twin flame" recurs as an alternate to "soulmate")*
- [ ] "Was he ever really my soulmate?" — *LOWER: retrospective-doubt variant, constructed*

15 headlines. No compliance flags identified for this set.

## 4. Healing/Moving-on

Pulled from the self-facing half of `love/LOST_LOVE` + `someone/REUNION` (excludes the
reunion-flavored content already covered above). 1,081 matching concerns, 217 purchased.
100 verbatim buyer quotes read directly.

**Flag before the headline set:** a real sub-theme in this data is actual bereavement,
not breakup — several quotes are from people whose spouse/partner *died* ("my wife and
partner of 53 years passed away," "losing him was the hardest grief I ever experienced"),
not left. That's a different emotional register and a more vulnerable audience than
romantic rejection. One headline below ("will I ever stop grieving him?") would likely
pull that audience in — listed separately, not folded into the main 12, so it gets a
deliberate decision rather than being included by default.

**Can't stop thinking about him**
- [ ] "Why can't I stop thinking about him?" — *HIGH: dozens of near-identical quotes ("constantly on my mind," "can't stop thinking about him")*
- [ ] "Why is he always on my mind?" — *HIGH: wording variant, equally common*
- [ ] "Why do I still think about someone who hurt me?" — *MED: tension variant, several quotes combine betrayal language with still-thinking-about-him*

**Missing him**
- [ ] "I miss him so much — will this ever stop hurting?" — *HIGH: "miss him so much my heart actually hurts," "miss him so much, I'm not happy without him"*
- [ ] "Will I ever stop missing him?" — *HIGH: simpler direct variant*
- [ ] "Why do I still miss him after everything?" — *MED: tension variant, implies a complicated/hurtful history*

**Should I move on**
- [ ] "Should I move on, or keep waiting?" — *HIGH: near-verbatim ("should I wait or should I move on")*
- [ ] "Why can't I let him go?" — *HIGH: "it's hard for me to let go," "I can't seem to move on"*
- [ ] "Is it time to move on, or give it one more try?" — *MED: tension variant, synthesizes the recurring stay-or-go decision*

**Closure / healing**
- [ ] "Will I ever find closure?" — *MED-HIGH: "not sure how to make closure," "can't move forward until I find closure"*
- [ ] "Will my heart ever heal?" — *MED-HIGH: "my heart will never heal," "I can't heal my heart and soul"*
- [ ] "Am I ever going to feel like myself again?" — *MED: broader synthesis of the general emotional tenor, not one direct quote*

12 headlines. **Separately flagged, not in the count above — bereavement-adjacent,
decide deliberately before running:**
- [ ] "Will I ever stop grieving him?" — matches the bereavement sub-theme specifically;
      scope the audience on purpose if this runs, don't let it target grieving
      widows/widowers by accident

No other compliance flags identified for this set.

## 5. Soulmate/Destiny

Pulled from `love/SEEKING_LOVE` (soulmate-pattern concerns, which include the live
"generic soulmate" and "who is my soulmate" incumbents) + `love/LOST_LOVE` (the "is my
ex the one" non-incumbent variant). 2,852 matching concerns, 436 purchased. 100 verbatim
buyer quotes read directly.

**This sub-group has structurally less new territory than the others** — 2 of its 3
named questions ("who is my soulmate," generic soulmate) *are* the current live ad set,
so most of the volume here is already-tested ground, not new. Also cut one planned
headline ("is he really my soulmate?") because it's a near-duplicate of a headline
already in Feelings/Commitment's soulmate-crossover cluster — running the same ad under
two sub-group labels isn't a real second test.

**Notable finding:** a large share of this pull (~12-15 of 100) is from people whose
spouse/partner died, now wondering if there's a new soulmate ahead — forward-looking,
not the backward-looking grief seen in Healing/moving-on. The second of three sub-groups
where bereavement surfaces as a real sub-theme, not a one-off.

**Soulmate after loss**
- [ ] "Will I find a new soulmate after loss?" — *HIGH: many direct quotes, forward-looking*
- [ ] "Is there still a soulmate out there for me?" — *HIGH: matches "is my soulmate still out there"*
- [ ] "Am I ready to love again after losing him?" — *MED: bereavement-sensitivity flag applies*

**Where is my soulmate**
- [ ] "Where is my soulmate right now?" — *HIGH: a genuinely distinct axis (location) from the live who/when incumbents*
- [ ] "Is my soulmate closer than I think?" — *MED-HIGH: matches "is my soulmate near"*
- [ ] "Why haven't I found my soulmate where I am?" — *MED: frustration variant*

**How will I recognize my soulmate**
- [ ] "How will I know when I meet my soulmate?" — *HIGH: matches "how I can recognise"*
- [ ] "What are the signs I've already met my soulmate?" — *MED: worded around signs, not a flat yes/no, to stay distinct from the live "already met" incumbent*
- [ ] "Will I recognize my soulmate right away, or take time to see it?" — *MED: tension variant*

9 headlines (3 clusters, not 4 — an honest reflection of how much non-incumbent
territory actually exists in this sub-group).

## 6. Loneliness/Timing

Pulled from `love/SEEKING_LOVE`, excluding the live "when will I meet them" and "have I
already met them" incumbent patterns. 3,831 matching concerns, 593 purchased. 100
verbatim buyer quotes read directly.

**Same bereavement pattern again** — ~10-12 of 100 quotes are from widows/widowers,
consistent with Soulmate/destiny and Healing/moving-on. The third of six sub-groups to
show this independently.

**Will I be alone forever**
- [ ] "Will I be alone forever?" — *HIGH: direct, very common*
- [ ] "Am I meant to be alone?" — *HIGH: matches "my life is meant for me to be alone"*
- [ ] "Is there really someone out there for me?" — *MED-HIGH: hope-framed*

**Tired of searching**
- [ ] "Am I ever going to stop searching?" — *HIGH: the original Wave-1 pick, re-confirmed by direct VOC reading*
- [ ] "Why do I keep ending up alone?" — *MED: pattern-frustration variant*
- [ ] "Have I given up on love without realizing it?" — *MED: matches "I've given up, no thoughts, no feelings"*

**Will I find love again**
- [ ] "Will I find love again?" — *HIGH: extremely common exact phrasing*
- [ ] "Is it too late for me to find love?" — *MED-HIGH: matches "I feel too old to hope"*
- [ ] "Is real love still out there for me?" — *MED: matches "I can't seem to find real love"*

9 headlines.

**Cross-cutting bereavement flag — confirmed across 3 of 6 sub-groups, decide on purpose
before running any of these:**
- [ ] "Will I ever stop grieving him?" (healing/moving-on)
- [ ] "Will I find love again after loss?" (loneliness/timing) / "Am I ready to love
      again after losing him?" (soulmate/destiny)

## 7. Curse/Bad-luck (tarot mechanism)

**Sourcing note — read before treating this like sub-groups 1-6:** this set was NOT
built from the `conversations` table ranked by conv%. That table only contains buyers
who already entered through the *current* ad questions/targeting — mining it to predict
a new cold-traffic hook's performance is circular (the population is pre-selected by a
different question entirely). Instead, this set was built from real, unprompted public
VOC (a Reddit scrape across `am I cursed`, `hexed by someone`, `bad luck in love`, and
`generational curse` search terms, ~32 threads read directly) plus the existing TSW
prompt vocabulary already in production (`server/lib/prompts.ts` — "shadow," "energetic
interference," "clouded connection"). Treat every headline below as an **unvalidated
Wave 1 hypothesis**, not a ranked pick — that's the entire reason it's going into Wave 1
axis discovery rather than straight to scale.

**Compliance approach — self-frame phrasing throughout:** every headline is phrased in
first person ("Am I...", "Why do I...") to match the same mechanism the live incumbents
and sub-groups 1-6 already use, per Meta's Personal Attributes policy
(`transparency.meta.com/policies/ad-standards/objectionable-content/privacy-violations-personal-attributes/`)
— the ad must never assert a condition about the viewer in 2nd person ("You're
cursed"); presenting it as the reader's own question about themselves avoids that
entirely. **Generational curse should run as a separate ad set/audience**, not bundled
with the other 3 — its real-world VOC skews self/family-pattern-focused, not
"will-he-come-back" focused, so a win or loss there is more likely about audience fit
than about the phrasing.

**Bad luck**
- [ ] "Why am I so unlucky in love, no matter what I do?" — *HIGH: near-verbatim, r/relationships "I've always been really unlucky in love"*
- [ ] "Is it something I'm doing — or something following me?" — *MED-HIGH: composite of r/relationships + r/witchcraft "bad luck seems to seek him out"*
- [ ] "Bad decisions, or bad luck? How do I tell the difference?" — *HIGH: r/witchcraft thread title, near-verbatim*

**Cursed relationship**
- [ ] "Why do I feel cursed in relationships, over and over again?" — *HIGH: verbatim, r/Vent "I feel like I am 'cursed' in relationships"*
- [ ] "Am I cursed, or is this just how it goes?" — *MED-HIGH: composite, r/spirituality "Do you believe someone can be cursed/have constant bad luck?"*
- [ ] "Am I cursed, or is this just how my relationships always end?" — *MED-HIGH: r/spirituality tension pattern, self-framed*

**Hexed by someone (third party)**
- [ ] "Could someone be affecting my relationship without me knowing?" — *HIGH: near-verbatim, r/witchcraft "Can someone curse or hex your love life??"*
- [ ] "If someone wanted to come between us, would I even know?" — *MED-HIGH: r/Witch — ex-girlfriend sabotage thread*
- [ ] "Was it something I did — or someone else's doing?" — *MED: structural variant, self-vs-other-cause*

**Generational curse** — ⚠ separate ad set/audience, see note above
- [ ] "Am I repeating a pattern in love I never chose?" — *MED-HIGH: r/blackladies "What generational curses have you broken and how did you do it?"*
- [ ] "What if it isn't about me — but about what came before me?" — *MED: r/spirituality "the bloodline was waiting for you"*
- [ ] "Is it my pattern — or my bloodline's?" — *MED*

12 headlines. Confidence tags reflect how directly each traces to a real quote, same
convention as sub-groups 1-6 — but note the source pool (public Reddit VOC) is a
different kind of evidence than the purchased-`conversations` VOC used elsewhere in
this doc, so these tags aren't directly comparable to e.g. Trust/Honesty's tags.

### Mechanism spec: tarot card-pull (for `fb-tarot-add-card`)

Delivery mechanism for this sub-group only: ad → landing page → bridge line → pick 1 of
3 face-down cards → 4-beat reveal → soft CTA into chat. Each cluster above maps to one
lander (one deck registry entry) with 3 card options shown as the pick-one quiz.

**Bad luck** — bridge line: *"Every path in love leaves a mark. Pick the card that
matches how yours has felt."*
- **Nine of Swords** (anxiety, recurring hurt that won't let you sleep)
  1. Setup: This card surfaces in the middle of the night — the swords hang over a figure who can't rest. It's the card of a mind that keeps replaying the same worry.
  2. Decode him: Points to a man who circles the same doubts about himself before he ever gets close to you — his hesitation isn't about you, it's a pattern he brings into every relationship.
  3. Block: Not bad luck. Unprocessed worry — his or yours — that keeps resurfacing right when things start to feel good.
  4. Opening: The swords can be lowered. What matters next is knowing which worry is actually driving this one.
- **Five of Pentacles** (left out in the cold, shut out of love others seem to find easily)
  1. Setup: Two figures pass a lit window in the cold, not stepping inside. This is the card of feeling shut out of something others seem to walk into easily.
  2. Decode him: Suggests he's learned to expect being on the outside of love — so he keeps himself half a step away, even from you.
  3. Block: He may not believe he's allowed in, so he never fully walks through the door.
  4. Opening: That belief can shift — but only once it's named instead of just felt.
- **Eight of Cups** (walking away again and again, still searching)
  1. Setup: A figure walks away from stacked cups at night, toward the mountains. The card of leaving before it's finished.
  2. Decode him: Points to a man who's already halfway out the door in his own mind, still searching for something he can't yet name.
  3. Block: Restlessness, not indifference to you specifically — he doesn't know yet what would make him stay.
  4. Opening: What he's searching for might be closer than he thinks. That's usually where the real reading begins.

**Cursed relationship** — bridge line: *"Some patterns repeat until they're named. Pick
the card that shows what yours has been pointing to."*
- **The Tower** (sudden collapse, and it keeps happening)
  1. Setup: Lightning splits the tower, figures falling from the windows. Sudden, and it always looks the same from the outside.
  2. Decode him: A man whose relationships collapse at a specific pressure point — something small triggers something much older.
  3. Block: Not a curse. An old wound that turns ordinary moments into breaking points.
  4. Opening: Naming that pressure point is usually the difference between the next collapse and the first real repair.
- **Ten of Swords** (hitting the same rock bottom every time)
  1. Setup: A figure lies face-down, ten swords in his back — but the sky behind him is already lightening.
  2. Decode him: Points to a man who reaches the same rock bottom in love, again and again, right before he'd otherwise break the pattern.
  3. Block: He stops one step before the turn — the story always ends here because no one's shown him what's just past it.
  4. Opening: The sunrise in this card isn't decoration. It's the part of the story that usually gets skipped.
- **The Devil** (feeling bound to a pattern you can't break free of)
  1. Setup: Two figures stand chained — loosely enough to simply lift the chains off, if they looked down.
  2. Decode him: Shows a man bound to something he could walk away from, but hasn't tested whether he actually can.
  3. Block: Not the relationship. Whatever he's convinced himself he can't survive without.
  4. Opening: The chains are looser than they look. What's under them is the real question.

**Hexed by someone** — bridge line: *"Not everything shaping your relationship is
visible yet. Pick a card to bring it into view."*
- **The Moon** (something hidden, working on you without being seen)
  1. Setup: A path winds between two towers under an uncertain moon — nothing on this path is quite what it appears.
  2. Decode him: Points to something operating in the space between you two that hasn't been named out loud yet.
  3. Block: What's staying hidden — not necessarily someone else, but something unspoken shaping his behavior.
  4. Opening: The moon always gives way to a clearer sky. What's under it is worth seeing directly.
- **Three of Swords** (heartbreak caused by a third party)
  1. Setup: A heart pierced by three swords, rain falling around it. The card of a wound with a source.
  2. Decode him: Suggests something — or someone — from outside the two of you has already left a mark on how he shows up now.
  3. Block: Old damage being mistaken for present disinterest.
  4. Opening: Once the source is named, the swords tend to lose their grip fast.
- **Seven of Swords** (someone acting behind your back)
  1. Setup: A figure creeps away holding five swords, two left behind. Something's being taken, quietly.
  2. Decode him: Points to something happening at the edges of the relationship that hasn't been brought into the light.
  3. Block: Whatever's being kept just out of view — not always with bad intent, but affecting things regardless.
  4. Opening: What's hidden here isn't unreachable. It just hasn't been asked about directly yet.

**Generational curse** — bridge line: *"Some patterns started before you did. Pick a
card to see how far back yours goes."*
- **Wheel of Fortune (reversed)** (a cycle repeating itself)
  1. Setup: The wheel stalls mid-turn — the same figures rise and fall in the same order, every cycle.
  2. Decode him: Points to a pattern in his relationships that started long before you — the wheel was already turning.
  3. Block: Momentum, not malice — patterns repeat because nothing's yet interrupted them.
  4. Opening: A wheel that's been named can be pushed off its old track. That's usually the actual turning point.
- **The Hierophant** (inherited belief, family pattern passed down)
  1. Setup: A figure teaches from tradition, two students kneeling before an old structure.
  2. Decode him: Suggests he's carrying a blueprint for relationships that was handed to him, not chosen by him.
  3. Block: Inherited belief — about love, about commitment — running quietly underneath his own choices.
  4. Opening: Blueprints can be redrawn. The first step is seeing which lines were never really his.
- **Judgement** (the reckoning point where the cycle can finally break)
  1. Setup: Figures rise from open graves at the sound of a horn — the card of a reckoning, not an ending.
  2. Decode him: Points to a moment coming where the old pattern gets seen clearly enough to finally be answered.
  3. Block: Timing — the reckoning hasn't happened yet, but the horn is already sounding.
  4. Opening: What happens right after that moment is usually where everything changes.

## 8. Twin-Flame Runner/Chaser (tarot mechanism)

**Sourcing note — same caveat as sub-group 7:** built from external Reddit VOC (a
broad-sweep scrape of `r/twinflames`, ~14 threads read directly across "twin flame
runner chaser" and "twin flame separation" searches), not ranked by internal conv% —
treat as an unvalidated Wave 1 hypothesis. This territory is a direct extension of a
finding already inside this doc's own data: "my soulmate"/twin-flame language was the
single highest-momentum phrase in Reunion/Return (sub-group 3) and recurred as
crossover in Feelings/Commitment (sub-group 2) — this sub-group mines the specific
runner/chaser dynamic within that community, which neither of those sub-groups targets
directly. Lower compliance risk than sub-group 7 or the attachment/trauma-bonding
territory sampled in the same scrape (pure relationship-mysticism register, no
clinical or supernatural-affliction claims) — same self-frame phrasing convention
applies regardless.

**Does he think about me too**
- [ ] "Does he think about me as much as I think about him?" — *HIGH: near-verbatim, "Do runners genuinely think about their chasers the same way that chasers think about them?"*
- [ ] "I can't stop thinking about him. Does he feel the same pull?" — *HIGH: near-verbatim, "My Twin Flame has never left my mind since the day I met them"*
- [ ] "Am I chasing someone who's already forgotten me — or still holding on?" — *MED: synthesized tension variant*

**Why he keeps pulling away**
- [ ] "Why does he keep pulling away from me?" — *HIGH: matches recurring "avoid our feelings... out of fear" runner behavior*
- [ ] "I keep chasing. He keeps running. Why?" — *HIGH: near-verbatim, "I'm the chaser in my journey... tired of chasing nothing"*
- [ ] "Is he running from his feelings — or does he just not feel them?" — *MED-HIGH: matches "runners cope with it differently... it's all a distraction for them"*

**Will the separation end**
- [ ] "Will this separation ever end?" — *HIGH: matches "What stage of your twin flame separation are you in?"*
- [ ] "How long can a separation like this really last?" — *HIGH: near-verbatim, "anyone in separation over 10 years?"*
- [ ] "Is this separation temporary — or is it really over?" — *MED: synthesized from success-story vs. stuck-for-years contrast*

**Do we still have the connection**
- [ ] "Do we still have that connection, even apart?" — *MED-HIGH: matches "Do you still experience the telepathy?"*
- [ ] "I still feel him, even now. Does he feel me too?" — *MED-HIGH: matches "even out of contact in 3D they still feel the energetic push"*
- [ ] "Is the connection still there — or am I the only one holding on?" — *MED: synthesized from "Do you still think they'll be back?"*

12 headlines, self-framed throughout.

### Mechanism spec: tarot card-pull (for `fb-tarot-add-card`)

Same delivery pattern as sub-group 7: ad → bridge line → pick 1 of 3 face-down cards →
reveal → soft CTA into chat.

**Does he think about me too** — bridge line: *"Some connections don't end when the
distance does. Pick a card to see what's still there."*
- **Two of Cups** — mutual bond, shows reciprocity
- **The Moon** — uncertainty, can't tell what's real from here
- **The Hanged Man** — his side of it, paused rather than gone

**Why he keeps pulling away** — bridge line: *"Every runner has a reason. Pick a card
to see his."*
- **The Hermit** — withdrawal, needing solitude before he can face it
- **Death** — something has to end in him before he can return
- **Four of Swords** — retreat and recovery, not rejection

**Will the separation end** — bridge line: *"Every separation has a shape. Pick a card
to see where yours is heading."*
- **The Star** — hope after hardship, a real sign
- **Ten of Wands** — currently weighed down, but a burden that gets set down eventually
- **Wheel of Fortune** — cycles turn; what's apart now doesn't stay apart forever

**Do we still have the connection** — bridge line: *"Distance changes things. Pick a
card to see if this is one of them."*
- **The Lovers** — the bond itself, still intact
- **The Sun** — clarity and warmth, connection confirmed
- **Strength** — quiet, unglamorous knowing that persists without contact

**Excluded territory — attachment style / love-bombing / trauma bonding (2026-07-29):**
sampled in the same broad-sweep Reddit scrape as sub-group 8 (queries: "anxious
attachment relationship," "was I love bombed," "trauma bond why can't I leave" —
`r/attachment_theory`, `r/dating_advice`, `r/abusiverelationships`,
`r/emotionalintelligence`). Real volume, real recurring vocabulary — but **deliberately
not turned into headlines, and shouldn't be re-mined in a future refresh without
revisiting this decision:**
1. Some source posts describe active domestic abuse, not relationship dissatisfaction
   (e.g. a poster describing leaving a partner who tried to hit her while pregnant).
   Building conversion-optimized ad copy from that language risks pulling someone in a
   dangerous situation toward a paid reading funnel instead of real help, and profiting
   from that pull — a harm question, not just a compliance one.
2. Even setting that aside, "anxious attachment" and "trauma bond" are named
   psychological conditions/mechanisms, not folk-mystical concepts like "cursed" — an
   ad headline here sits closer to Meta's own banned Personal Attributes example
   ("Depression getting you down?") than anything else mined this session.

If this territory is revisited later, it needs an explicit decision at that time, not a
default inclusion — same treatment as the bereavement flags elsewhere in this doc.

## Wave 2 (Weeks 4–6) — Double down

Take the top 2 axes from Wave 1's ad-metric read (not the chat-conv% read) and test 3
phrasing variants each — most of this is already covered by the fuller sets above, but
kept here as a fallback pick order if a narrower re-test is needed.

- [ ] Select 2 winning axes from Wave 1
- [ ] Launch 3 variants each (6 headlines) against the new leader from Wave 1
- [ ] Read: CTR + cost/purchase, 3-week minimum runtime

## Wave 3 (Weeks 7–9) — Refine + explore longshots

Test the 2nd/3rd-best individual questions from the winning axis, plus small-budget
exploratory tests on the high-conv%/thin-n "longshots" that didn't qualify for the
primary list (real chat-conv% but n<150, so unproven at ad scale):

- "Is there still a chance for us?" (n=14, 42.9%, thin)
- "Does he still love me?" (n=22, 40.9%, thin)
- "Will we get back together?" [someone/REUNION variant] (n=49, 32.7%, thin)
- "Is he genuine or just serious about me?" (n=71, 31.0%, thin)
- **"Am I being scammed?"** (n=41, 43.9%, thin) — ⚠ compliance review required before
  testing (romance-scam framing); route through `docs/fb-compliance-catalog` check first

- [ ] Compliance review the scam-angle headline before including it in this wave
- [ ] Launch 2nd/3rd-place questions from the winning axis (small budget, hypothesis
      confirmation)
- [ ] Launch 2–3 longshot tests at reduced budget (these need bigger spend to reach
      significance given thin baseline n — treat as exploratory, not a bet)

## Wave 4 (Weeks 10–12) — Lock and scale

- [ ] Identify the single best-performing headline across Waves 1–3 (by cost/purchase,
      not CTR alone)
- [ ] Run one final challenger split: new champion vs. the Wave-1 control, confirm the
      win holds at full budget
- [ ] Document the winner back into memory (`fb-ad-headlines-raw` +
      `fb-ad-question-conversion-ladder`) as the new incumbent baseline
- [ ] Decide whether to retire the old live ad set (soulmate/already-met/timing) or
      keep it running alongside the new winner for a different audience segment

## Full candidate pool by sub-group (n≥150, excludes live incumbents)

Every viable named-question pattern with its raw n/conv%, not just the headlines
selected into the sets above — the underlying data those headlines were built from.

**Trust/honesty** (2,289 total)
| Question | n | conv% |
|---|---|---|
| Is he cheating / can I trust him? | 221 | 19.5% |
| Is he lying / telling the truth? | 358 | 18.2% |
| Is he cheating / faithful? | 608 | 17.3% |
| Is there someone else? | 206 | 17.0% |
| Can I trust him? | 191 | 12.0% |

**Feelings/commitment** (3,167 total)
| Question | n | conv% |
|---|---|---|
| Will he commit / propose / marry? | 398 | 24.1% |
| Will we make it / work out? | 412 | 23.1% |
| Why is he distant / pulling away? | 385 | 19.0% |
| Should I stay or leave? | 232 | 19.0% |
| Does he really love / want me? | 305 | 17.7% |
| Where is this relationship going? | 147 | 18.4% *(just under the n=150 floor — borderline)* |
| Is he the right one / my soulmate? | 945 | 15.0% *(huge volume, weak conv)* |

**Reunion/return** (2,345 total)
| Question | n | conv% |
|---|---|---|
| Will we get back together? | 365 | 22.7% |
| Why did he leave / ghost me? | 702 | 21.2% |
| Will he come back? | 801 | 18.4% |
| Does he still love / think of me? | 275 | 18.2% |

**Healing/moving-on** (1,126 total)
| Question | n | conv% |
|---|---|---|
| Will I find closure? | 213 | 22.5% |
| I miss him / can't stop thinking | 429 | 21.2% |
| Should I move on / let go? | 459 | 17.0% |

**Soulmate/destiny** (2,935 total — mostly incumbent territory)
| Question | n | conv% |
|---|---|---|
| Is my ex my soulmate / the one? | 557 | 19.0% *(only non-incumbent candidate at real volume)* |

**Loneliness/timing** (5,122 total — mostly incumbent territory)
| Question | n | conv% |
|---|---|---|
| Tired of searching / given up | 637 | 16.6% |
| Will I be alone / I am lonely | 2,167 | 15.9% |
| Will I find / meet love? | 1,043 | 15.4% |
| Will I love again (later in life)? | 387 | 15.0% |
| Will I ever find love? | 310 | 12.9% |

Longshots (n<150, real conv% but unproven at scale) are listed in Wave 3 above.

## Open questions to revisit after Wave 1

- Does hook strength (ad CTR) track chat-conv% at all, or are they decoupled? (First
  real data point on this will come from Wave 1's control-vs-test read.)
- Is "Why did he ghost me?" (reunion) cannibalizing "Will I find closure?" (healing) —
  they're adjacent themes from different angles; watch for overlapping audiences if
  both go live in the same period.
