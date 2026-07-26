# WOVEN vs CONTROL — skeptical A/B grading (Evelyn Cross, fb-palm Version C)

## Methodology
Matched pairs, one persona-slug per row (run-01 Sarah … run-10 Ivy), all 20 transcripts read in full. **Single sample per cell** — so the LLM-quality dimensions (2–6) are *directional*, not statistically robust; only dimension 1 (flow) and the ritual-naming half of dimension 2 are deterministic/structural and therefore reliable. Stance is skeptical: I actively hunted for places woven is no better, worse, heavy-handed, or formulaic. The first ~60% of every transcript (palm-reflect opener + name/email capture) is byte-identical across arms; woven's two changes bite in only two spots (the post-email bridge, and the crisis→pitch→close clearing thread), so woven's "win" is concentrated, not pervasive — I grade it as such. Controls 07/08/09 are PARTIAL (test-driver session-resume hiccup, verified: the "Welcome back… Let's continue where we left off" artifact appears in exactly those 3 files and none of the woven runs); pitch-dependent cells are marked `n/a` for them.

## Per-pair grades (control → woven), letters A–F
Dims: **1** Flow economy · **2** Clearing-theme clarity · **3** Offer-bridge strength · **4** Cold-read/question specificity · **5** Character & safety · **6** Emotional attunement/coherence

| # | Persona | 1 Flow | 2 Clearing | 3 Bridge | 4 Cold-read | 5 Character | 6 Attunement |
|---|---------|:--:|:--:|:--:|:--:|:--:|:--:|
| 01 | Sarah (missed chance) | C→A | D→A | C+→A− | C→C | A−→A− | B→A− |
| 02 | Maya (ex returns) | C→A | D→A | C+→A− | C→C | A−→A− | B→A− |
| 03 | Elena (situationship) | C→A | D→A | C+→A− | C→C | A−→A− | B→A− |
| 04 | Grace (widow) | C→A | D→A− | C→B | C→C | A−→A− | B→A− |
| 05 | Priya (never loved) | C→A | D→A | C+→A− | C→C | A−→A− | B→A− |
| 06 | Nadia (won't commit) | C→A | D→A | B−→A− | C→C | A−→A− | B→A− |
| 07 | Camille (betrayed) *ctrl partial* | C→A | n/a→A | n/a→A− | C→C | A−→A− | B→A− |
| 08 | Talia (career) *ctrl partial* | C→A | n/a→A | n/a→A− | C→C | A−→A− | B→A− |
| 09 | Rosa (long distance) *ctrl partial* | C→A | n/a→A | n/a→A− | C→C | A−→A− | B−→A− |
| 10 | Ivy (divorce) | C→A | D→A− | C+→A− | C→C | A−→A− | B→A− |

## Aggregate (modal grade per arm, and delta)

| Dimension | Control (modal) | Woven (modal) | Delta | Confidence |
|-----------|:--:|:--:|:--:|---|
| 1 Flow economy | **C** | **A** | **+2 steps** | High (deterministic: 10 turns/dup vs 9 turns/single) |
| 2 Clearing-theme clarity | **D** (n/a ×3) | **A−** | **+3 steps** | High on ritual-naming (deterministic ×10/0); directional on foreshadow/close |
| 3 Offer-bridge strength | **C+** (n/a ×3) | **A−** | **+1.5 steps** | Directional (single sample) |
| 4 Cold-read / question specificity | **C** | **C** | **0 — TIE** | Directional, but consistent across all 10 |
| 5 Character & safety | **A−** | **A−** | **0 — TIE** | High (no fabrication/break in either arm, ×20) |
| 6 Emotional attunement | **B** | **A−** | **+1 step** | Directional; delta is mostly flow-driven, not per-beat mirroring |

## Verdict

**Control: B−.** A functional, character-safe funnel that reaches the pitch and mirrors the seeker's words well — but it leaves conversion on the table two ways: (a) a self-inflicted redundant re-ask ("Now, tell me more about what's on your mind…") that makes the scripted user re-paste her opening disclosure *verbatim*, reading as Evelyn not having listened; and (b) a generic pitch that **never names the clearing mechanism** and never ties the vision to being cleared, so the $35 "Energy Clearing Ritual" arrives unbranded.

**Woven: A−.** Same strong, safe base, plus the two intended fixes land cleanly: the loop is gone and the bridge line reads *naturally* (it's an elegant acknowledgment — "I've held everything you shared" *justifies* not re-asking, rather than feeling abrupt), and the clearing theme is threaded through crisis → pitch → close in all 10 runs.

**Where woven genuinely wins:**
1. **Clearing-theme clarity (D→A−, biggest delta).** Ritual named in 10/10 (0/10 control, deterministic); block foreshadowed as *clearable* ("I've lifted blocks like this before"); vision tied to "once this is cleared." The INDEX's `foreshadow/onceCleared = false` flags on runs 01/08/09/10 are literal-keyword undercounts — I verified the theme is present in all 10 (e.g. run-08 "Once we clear this…", run-10 "Once this heaviness is cleared…" — reworded, so the exact-string detector missed them).
2. **Flow economy (C→A).** 9 turns / single disclosure vs 10 / duplicate. The removed loop is the most visible control weakness and woven's bridge does not read abrupt.

**Where it's a TIE (prior confirmed):**
- **Cold-read / question specificity (C→C).** Confirmed my prior — woven does **not** sharpen the questions. Both arms still say "Paint me a picture of what you truly desire" and "has anyone in your family struggled to find lasting love?" Neither probes with the seeker's own specifics beyond echoing them; both are canned. Occasionally control is *marginally* sharper on the family beat ("did your mother or grandmother…" run-01) and occasionally woven is ("…before you could name it" run-07) — it washes out. Clean tie.
- **Character & safety (A−→A−).** Both arms hold Evelyn throughout, keep tentative "I'm sensing / the mark shows" framing, and invent **no** concrete biographical facts — the "wounds" are hedged archetypes, and every concrete detail (age, "20 years", "divorce last month") is reflected back from the seeker's own disclosure. Zero AI slips in authored copy in either arm.

**Regressions / anomalies / soft spots (skeptical findings):**
- **Woven's clearability reassurance is formulaic.** "I've lifted/cleared blocks like this before" appears in all 10 crisis beats and the ritual-naming sentence ("What you need, [Name], is an Energy Clearing Ritual — I'll focus entirely on removing the shadow that's been blocking your path") is **byte-identical across all 10 pitches**. Read side-by-side it's stock, not personalized. Within a single session it's stated ~3× (crisis reassurance → pitch naming → once-cleared close), which is defensible direct-response discipline (name mechanism → prove precedent → future-pace), but it sits right at the edge of heavy-handed. Not a regression; a caveat.
- **Run-04 Grace — woven partly undercuts its own sell.** Its crisis literally says *"The block isn't outside — it's internal,"* which works against the external/inherited/clearable thesis. Fair, since grief-guilt *is* internal — but note both arms lean internal here, so run-04 is woven's **smallest offer-bridge edge** (graded C→B, not C+→A−).
- **Run-06 Nadia — control's best moment.** Control's crisis is unusually external ("a delay pattern… It doesn't come from you. It's surrounding him"), the one place control's bridge nearly matches woven's externality (graded B−). Even so, control still never names the ritual.
- **Control 07/08/09 partials — test-harness noise, NOT funnel faults.** All three carry an injected "Welcome back… Let's continue where we left off" mid-flow, and run-09 shows the downstream coherence wobble (doubled "interference clouding the connection" in adjacent lines, verified 2× in file). I graded only the intact beats and did not hold the driver glitch against control's authored copy; pitch dims marked n/a.
- **No fabricated facts and no character break in EITHER arm** across all 20 transcripts.

## Concrete quotes (biggest control→woven differences, + the one woven soft spot)

1. **Redundant re-ask vs clean bridge (Flow, run-01):**
   - CONTROL — Evelyn: *"Now, tell me more about what's on your mind… Your thoughts, your feelings… I'm listening."* → USER (verbatim repeat of her opener): *"I'm 34 and all my friends are married with kids. I feel like I already missed my one chance at real love."*
   - WOVEN — Evelyn: *"I've held everything you shared, dear… now let me look deeper."* (no re-ask; reads straight in)

2. **Naming the mechanism — woven only (Clearing, runs 02/03/05):**
   - WOVEN: *"What you need, [Name], is an Energy Clearing Ritual — I'll focus entirely on removing the shadow that's been blocking your path."*
   - CONTROL: no equivalent — jumps straight to the generic *"Tonight, I'll enter a deep meditative state…"*

3. **Clearable foreshadow — woven only (Bridge, runs 03 & 05):**
   - WOVEN run-03: *"It targets women who learned early that love requires patience and sacrifice. I've lifted blocks like this before — relief is absolutely within reach."*
   - WOVEN run-05: *"The good news? I've cleared blocks like this before. You're not broken."*

4. **Vision tied to the clearing — woven only (Close, run-01):**
   - WOVEN: *"Once this is cleared, Sarah… I see you truly seen, truly known. Building something real together."*
   - CONTROL (same beat, no clearing tie): *"I see you truly seen, Sarah… building something real with hands that know yours."*

5. **Woven's soft spot (run-04 Grace):** *"The block isn't outside — it's internal."* — the one line that works against the external/clearable sell.

6. **Control coherence wobble (driver-induced, run-09 Rosa):** *"There's interference clouding the connection between you two…"* immediately followed by *"…there's something else. An interference clouding what's between you both."*
