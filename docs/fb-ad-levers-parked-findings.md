# Parked — findings from the alone/commit run that aren't age or vocab

Pulled out of `fb-ad-levers-alone-commit.md` to keep that doc to the four matrices.
Nothing here is built or scheduled. Delete if you don't want it.

---

## 1. The woman who is fine — the highest-value slice in the run

**n=81 · 17.3% buy · $12,099/1,000 · +161% vs theme base.**

She is not desperate and says so unprompted, in the same breath as the ask. Every ad we run
assumes the opposite, so she has nothing to click.

> *"while I am OK being alone, I'm not OK being lonely. I miss that very much."*
> *"Just feeling alone not lonely"*
> *"I'm alone. I'm ok. But am I always going to be alone?"*
> *"I do love my life alone but occasionally miss a warm embrace or someone asking 'how was your day?'"*

- "I'm OK being alone. I'm not OK being lonely."
- "I'm alone and I'm fine. Am I always going to be alone?"
- "Alone and lonely aren't the same thing. Which one am I?"
- "I like living alone. I'd still like someone to ask how my day was."

⚠ Needs its **own lander**. The existing alone reads open on weight and exhaustion
("Forever is the weight of it") — right for the incumbent, wrong for her. Answering a woman
who told you she's fine with a read about how tired she must be will lose her.

---

## 2. Two themes hiding inside the loose "commit" regex

The first pass used `commit|marry|marri`, which catches "married"/"marriage". 83% of that
pool was not the commitment question — it was these:

| Theme | n | buy% | rev/1,000 | vs bucket base |
|---|---|---|---|---|
| her own unhappy marriage | 721 | 11.9% | $7,143 | +54% |
| he is married — she's the other woman | 213 | **15.5%** | $7,080 | +53% |

Both are strong and neither is mined. Own run each.

---

## 3. Slice values inside the alone theme

| Slice | n | buy% | rev/1,000 | vs theme base |
|---|---|---|---|---|
| "alone but OK / not lonely" | 81 | 17.3% | $12,099 | +161% |
| "destined to be alone" | 37 | 10.8% | $8,324 | +80% |
| states a duration in years | 405 | 11.6% | $8,165 | +76% |
| "the rest of my life" | 101 | 11.9% | $7,386 | +59% |
| **"tired of being alone"** | **154** | **5.8%** | **$3,589** | **−23%** |

🔴 **"Tired of being alone" is the most common phrase in the corpus and its worst-performing
slice.** It reads as the obvious hook and it loses. Don't build on it.

---

## 4. Which lander each set points at

Deck: **`return-mhf`** (face-down; reveals Magician / Hanged Man / Fool).

| Theme | Existing hooks |
|---|---|
| alone | `cards-alone-forever`, `cards-meant-alone`, `cards-someone-for-me`, `cards-end-up-alone`, `cards-given-up`, `cards-stop-searching`, `cards-not-enough` |
| commit | `cards-will-commit`, `cards-wont-commit`, `cards-ready-commit`, `cards-forever-or-now`, `cards-too-long`, `cards-live-apart` |

Precedent: soulmate already has both levers built — 11 age hooks (`cards-slipping-past` …
`cards-allowed-to-want`) and 8 keyword hooks (`cards-blocking-soulmate` … `cards-heal-first`).

New headlines each need their own hook so the lander answers the exact question the ad
asked. Skill: `fb-tarot-hooks`.
