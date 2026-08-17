---
name: fb-ad-levers
description: "Use when a theme or ad is WINNING and you want to double down on it. Two ways to multiply a winner without inventing a new question: split it by AGE BAND (same wound, four ages, four ads) and stack a MECHANISM KEYWORD on top of it (same theme, plus energy/blocked/healing/connection). Both add specificity without shrinking the pool. Use when asked to: double down on a winner, extend a winning ad, build an age matrix, age-split a question, pick keywords or anchors for the spiritual audience, decide whether to rewrite an ad or add a dimension, or work out why an ad is decaying. Does NOT mine new questions (fb-ad-question-mining) and does NOT manage the portfolio (creative-cascade)."
---

# fb-ad-levers — you have a winner. Now double down.

**The premise:** a theme is working. Do not go hunting for a new one, and do not reword
the winner. Multiply it along two dimensions that add specificity **without shrinking the
pool**:

| Lever | What it does | Measured |
|---|---|---|
| **1. Age band** | same wound, four ages, four ads — Meta targets age for free | **3.3×** between best and worst band |
| **2. Mechanism keyword** | same theme, plus a word that names a practice | **2.4×** mechanism vs sentiment words |

Both keep the winning theme intact. That is the whole point — you are covering the same
audience with more ads, not trading reach for precision.

🔴 **Move ONE lever at a time.** In the age test, every headline keeps the theme word. In
the keyword test, age is held constant. Move both and you learn nothing about either.

---

# LEVER 1 — the age matrix

Same wound, but **what she fears changes with age.** Measured across `love` + `someone`:

| Band | n | Buy% | Rev/1,000 | Buried a spouse | Meta ad set |
|---|---|---|---|---|---|
| 25–45 | 63 | 4.8% | $3,159 | 2% | 25–44 |
| 45–55 | 61 | 11.5% | $6,820 | 10% | 45–54 |
| 55–65 | 112 | 7.1% | $4,661 | 8% | 55–64 |
| **65+** | 210 | **14.8%** | **$10,343** | **20%** | 65+ |

```bash
LIVE_AUDIT_CONFIRM=1 node .claude/skills/fb-ad-levers/scripts/age-bands.mjs --live
# --theme 'soul ?mate'  READ how her wound shifts (never to price it — see below)
# --bucket money        run the lever on another bucket (see the money section)
```

## Worked example — the soulmate winner, 12 headlines

**25–44** · wound: *he might already be here and I can't tell*
- "Have I already met my soulmate?" — *incumbent, doubles as control*
- "Why does my soulmate keep slipping past me?"
- "What keeps me choosing everyone but my soulmate?"

**45–54** · wound: ***never*** — *"I am 54, still single, I feel I will never find my soulmate in this life time"*
- "Why hasn't my soulmate found me yet?"
- "How long does a soulmate keep you waiting?"
- "Is my soulmate still coming, or have I already missed him?"

**55–64** · wound: *is a second act realistic*
- "Is there a soulmate for me after the marriage ended?"
- "How long does it take to find a soulmate the second time?"
- "Why did I give my best years to someone who wasn't my soulmate?"

**65+** · wound: ***too late*** — the recurring word in her own text is **still**
- "Is it too late to meet my soulmate?" — *near-verbatim: "am I to late at just turn 73"*
- "How much longer do I have to wait for my soulmate?" — *near-verbatim*
- "Am I still allowed to want a soulmate?"

**65+, the widowed slice** — 20% of that band. ⚠ Bereavement is a flagged sensitive theme:
a deliberate decision, never a default.
- "He was my soulmate. Do I get another?"

## Rules for writing an age set

1. **The theme word is in every headline.** It is the constant. 🔴 **Check the BINARY line
   last — that is where it goes missing.** An either/or reads as a finished sentence
   without its noun (*"Is something blocking me, or is this just how it ends?"*), so the
   eye passes over the gap. WHY and HOW-LONG force the noun; the binary does not. Read
   every headline with the ad set covered up: if you cannot tell which bucket it belongs
   to, Meta cannot either.
2. **Never state her age in the copy.** The ad set carries it. Meta's banned *form* is the second-person assertion — *"Are you over 65 and still alone?"*. First-person is fine.
3. **Three different attacks per band** — WHY, HOW-LONG, BINARY. Not three rewordings.
4. **Price on the full pool, read on the theme.** Only ~0.8% of women state an age, so scoping to one theme collapses the sample (the soulmate-scoped run fell to n=27 with zero buyers in two bands). The script warns you. Never present a pool-wide age value as if it were measured inside one wound.

---

# LEVER 2 — stack a mechanism keyword

**The words in an ad are a targeting input, not decoration.** Meta matches creative to the
content people engage with, so the keyword decides which pool you buy from.

🔴 **Mechanism words beat sentiment words.** A *mechanism* word names a practice with a
procedure. A *sentiment* word names a thing she feels.

| Keyword | Mentions | Rev/1,000 | vs base |
|---|---|---|---|
| reading | 180 | $16,217 | +229% |
| divine | 126 | $12,246 | +148% |
| **energy** | **613** | $10,669 | **+116%** |
| **healing** | **410** | $10,341 | **+110%** |
| spiritual | 446 | $9,740 | +97% |
| **blocked** | **908** | $8,220 | **+67%** |
| **connection** | **1,726** | $7,286 | **+48%** |
| twin flame | 334 | $6,186 | +25% |
| **soulmate** | **3,539** | **$4,487** | **−9%** |
| meant to be | 319 | $4,398 | −11% |
| universe | 154 | $3,357 | −32% |

```bash
LIVE_AUDIT_CONFIRM=1 node .claude/skills/fb-ad-levers/scripts/anchor-value.mjs --live
# --bucket money        rank the vocabulary inside one bucket
```

🔴 **Your highest-volume word is your weakest.** "Soulmate" is 5.1% of all buyer text and
the only major spiritual word below base. Two sources agree it buys volume, not customers:
cheapest CPL in the account ($3.88) and the weakest lead→purchase (8.2–10%, against
13.8–19.2% for present-man questions).

**But it is not there by accident — it was chosen as a SPIRITUALITY keyword.** The word is
an audience-recruitment lever: it tells Meta which pool to buy from and reliably brings the
spiritually-minded woman this offer needs. The cheap-and-thin numbers above are the price of
that, not a mistake to correct.

**So keep it for reach and stack a mechanism on top.** Theme constant, keyword the variable.

🔴 **Which means every arm in the keyword test is also a spiritual word.** The contrast is
between an **identity/outcome** word (*soulmate* — a person who will arrive) and a
**practice** word (*blocked*, *energy*, *healing* — a procedure the reading performs). It is
not spiritual vs secular, and the probe is the only arm that leaves the spiritual register
at all — which is exactly why a probe win must be read as a diagnostic, not scaled, until
you have checked what audience it brought.

## Worked example — soulmate + mechanism, 12 headlines

**Control**
- "Have I already met my soulmate?"

**Blocked + soulmate** · 908 · +67% · *the funnel's own mechanism — the reading reveals her block*
- "Is something blocking me from meeting my soulmate?"
- "Why do I keep getting blocked before my soulmate arrives?"
- "How long has something been blocking my soulmate from me?"

**Connection + soulmate** · 1,726 · +48% · *the only one that names a present person*
- "Is this connection my soulmate, or something else?"
- "Why does this connection feel like my soulmate when nothing is happening?"
- "How long has my soulmate been this close without me knowing?"

**Energy + soulmate** · 613 · +116%
- "Is my energy keeping my soulmate away?"
- "What does my energy say about my soulmate?"
- "How long has my energy been out of step with my soulmate?"

**Healing + soulmate** · 410 · +110%
- "Is my soulmate waiting for me to heal?"
- "Do I need to heal before my soulmate arrives?"
- "What still needs healing before my soulmate finds me?"

**The probe — one arm outside the matrix, no theme word at all**
- "What's blocking me from love?"

Run this or you never learn whether the theme word is *costing* you. Everything above
tests whether adding a mechanism helps; only this tests whether soulmate earns its place.

## Rules for writing a keyword set

1. **The theme word stays in every arm** except the probe — and the probe drops the
   *mechanism* word only, never the bucket word. "Why does money never stay?" is a valid
   probe; "Is something blocking me?" is not an arm at all, it is an untargeted ad.
2. **Anchors are not wound-neutral** — *soulmate* is the future, *connection* is a present person, *blocked* is an obstacle, *energy* is her state, *healing* is after damage. You are testing anchor+wound pairs. Don't claim you isolated the keyword.
3. **Start with blocked and connection.** Blocked matches what the reading actually delivers; connection is the highest-volume mechanism word and the only one that makes the question about a present man.
4. **Skip `purpose`** (+42%, 974 mentions) in a love slate — it belongs to a different bucket and pulls the wrong traffic. **`god`/`prayer`** (+50%, 627) works but recruits a religious audience: a brand decision, not a performance one.

---

# The money bucket behaves differently — run `--bucket money`

Both scripts take `--bucket` (default `love,someone` for age-bands, `all` for anchor-value).
Measured 2026-08-16 on 10,013 money concerns, base **$5,669/1,000**:

**The age lever collapses to two bands.** Money traffic is old: 119 of the 129 women who
state an age are 55+. Under-55 is 10 rows with **zero buyers** — unbuildable, don't guess it.

| Band | n | Buy% | Rev/1,000 | Meta ad set |
|---|---|---|---|---|
| 25–45 | 4 | 0.0% | — | *too thin* |
| 45–55 | 6 | 0.0% | — | *too thin* |
| 55–65 | 33 | 21.2% | $12,515 | 55-64 |
| 65+ | 86 | 18.6% | $10,105 | 65+ |

The wound also inverts against love. In love, 65+ fears *too late for a soulmate*. In money
she fears **too late to stop working** — the recurring word is again **still**: *"at 86 I am
still working"*, *"I am 71, soon 72, still working full-time because my husband passed away"*,
*"73 and do not have any pension left"*. 55–64 is the band before that: *"64 and have to work,
it concerns me that i have no retirement nest to fall back on"*.

**Keywords: `blocked` reproduces, `soulmate` is absent, `tarot` is the surprise.**

| Keyword | Mentions | Rev/1,000 | vs base |
|---|---|---|---|
| tarot/cards | 63 | $15,413 | +172% ⚠ thin |
| **blocked** | **282** | $9,638 | **+70%** |
| energy | 122 | $9,590 | +69% |
| god/prayer | 151 | $9,146 | +61% |
| purpose | 158 | $7,247 | +28% |
| spiritual | 77 | $7,169 | +26% |

`blocked` lands at +70% here against +67% on love — the one keyword that holds across
buckets, and the funnel's own mechanism. `purpose` is native to money (unlike in a love
slate) but only +28%, so it is not the lever. The tarot row is 63 mentions — treat it as a
hypothesis worth $2,000, not a finding: it hints that money-wound traffic arriving on a
tarot lander is worth multiples of base.

🔴 **Two different paid signals — never mix them.** These scripts use the webhook-stamped
`PAID` (`main_paid_at`), which is stricter than `purchased`. `docs/v1-money-bucket-voc.md`
uses `purchased` and reports the same bucket at $10,710/1,000. Both are internally
consistent; quoting one against the other invents a drop that isn't there.

# Two rules that govern both levers

🔴 **NEVER REWORD.** Change the age, the keyword, the attack, or the creative. If a new
line moves none of those, it is a reword in disguise. The one well-funded rewrite cluster
in the account lost twice: *"Have I already met my soulmate?"* $3,957 → **1.03**, against
its rewrites at 0.82 and 0.74.

*A change of ATTACK is not a reword.* *"Will he ever commit"* → *"Why won't he commit to
me"* won by 23%. `"Will he ever ___"` is the banned open form — presuppose instead.

🔴 **Check it is actually winning first.** Every ad above 1.15 ROAS had under $1,200
spend; everything above $2,000 spend sat between 0.74 and 1.03. And fbROAS sees only the
front end — not the list, the repeat readings, or the backend. A 1.03 may be fine on a
60–90 day view or may be the whole return. **That number decides whether to double down,
and it is not in this repo.**

# When a winner fades — the failure mode picks the lever

Three numbers, 7-day trend, from Ads Manager:

| What you see | What it means | What to change |
|---|---|---|
| Frequency ↑, CPM ↑, CTR ↓ | creative fatigue | **new creative**, same question |
| CPM ↑, frequency flat | audience too tight | **new placement or geo** |
| All flat, CPA stable | you're underspending | **more budget**, ~20% steps |
| CPL flat, lead→purchase ↓ | the wound is tapped | **new wound** → `fb-ad-question-mining` |
| CPL ↑ *and* lead→purchase ↓ | segment tapping out | **next segment** → `creative-cascade` |

# Don't build on these

- **Specific vs generic is not an axis** — 0.07 between buckets, 0.89 spread inside one.
- **Concern length is not a lever** — the biggest correlation in the data (3.6×), but the B/C test showed delivery can't cause it (105 vs 96 chars across arms). It tells you who she already was.
- **Depth into a rare wound is unproven** — every deep question is also a starved one ($450–497 lifetime), so depth and spend are confounded. A narrow question may never leave Meta's learning phase. Settle it for ~$2,000 before committing a build.
- **Never pool across `experiments.weights_changed_at`** — it produced a false 20% winner on the tarot B/C test; on the clean window it was 19 purchases each, p=0.89.

# Evidence grades — quote these with the numbers

Keyword and age effects are measured on her **concern text, written after clicking**. They
prove a correlation with a valuable customer, not that an ad carrying the word attracts
her. Only a live test closes that gap. Say so every time.
