# BRIEF · write one Marcus daily — day 9, Tuesday, "He's Gone Quiet"

**You are writing one email.** It goes to ~76,000 women on a tarot list. It is a free daily
reading whose job is to make her arrive at a booking page **with a question worth asking**.

⛔ **Day 2 Tuesday is already written** (`is-he-who-he-says-he-is`). You are writing **day 9**,
the next Tuesday. Do not touch day 2.

**Write to:** `improve-v1/v1-one-time-BEs/copy/07-marcus/daily/07-D3-hes-gone-quiet.md`
Markdown only. ⛔ Do not build HTML, do not edit the registry, do not commit.

---

## 1 · Read these before writing a word

All paths are from `improve-v1/v1-one-time-BEs/`.

| File | Why |
|---|---|
| `copy/07-marcus/daily/07-D-mon-the-weight.md` | ⭐ **THE reference text.** Its own Voice cell says so. Format, metadata table, beat structure, voice standard. |
| `copy/07-marcus/daily/07-D3-is-he-who-he-says-he-is.md` | The letter that already runs the **same opening shape** you have been given. Match its shape; ⛔ do not reuse its sentences. |
| `copy/07-marcus/marcus-voice-profile.md` | Voice B, the Letter. |
| `docs/07-marcus/voc/09-thirty-named-things.md` | Row **#6** is your named thing. Read its evidence column. |
| `scripts/07-spreads.json` → `hes-gone-quiet` | The spread. The `job` strings are a contract. |
| `docs/07-marcus/07-art-prompt.md` | The seven cards already used. You must not repeat one. |

## 2 · The offer, in one paragraph

Marcus Stone cuts one spread before light, the same cards for the whole list. The daily email
reads the **free** card(s) and names the rest as face down. Her question buys the **completion** —
$35 / $57 / $87 for one, two or three of *her* questions against that morning's cut. So the
withhold is not rhetoric: it is a number she can count. ⛔ **The price never appears in the
letter.** It lives on the booking page, and `copy-check.cjs` fails a letter that carries one.

## 3 · Your spread — `hes-gone-quiet` · "He's Gone Quiet" · 1 free + 6 paid = 7

**Her question:** *He's gone quiet on me. What is actually going on?*

**Shape:** *Five findings before the end she controls — how long it has run, the week before it,
what it keeps for him, the sentence he cannot send, and what the waiting has become — then her
limit, then what another stretch takes.*

| # | | Position | `job` — what the position must FIND |
|---|---|---|---|
| 1 | **FREE** | How long it's really been | The plain shape of the silence. What stopped, what did not stop, and how long it has actually run |
| 2 | paid | The week before he stopped | What landed on his side in the days before he stopped. Not a row — the thing he could not answer |
| 3 | paid | What the quiet lets him keep | What the quiet keeps available to him. The version of himself that stays true as long as nothing is said |
| 4 | paid | The sentence he can't start | The first sentence he would have to send to end it, and why that is the one he cannot start |
| 5 | paid | What the waiting has become | What the waiting has turned into a habit for her. The checking, and what it has replaced in her day |
| 6 | paid | Your end of the silence | Her own end of the silence, and the terms that are hers to set. Not a message to him — a limit |
| 7 | paid | What another stretch takes | What another stretch of this takes from her. The specific thing lost, not the general wearing down |

⛔ **The letter reads position 1 and nothing else.** Name that 2–7 exist and are face down. Never
read them. ⚠ Position 3 is the sharpest thing in the spread — point at it, do not spend it.

## 4 · The named thing — #6, and why it earns

**"He's gone quiet."** Her words, from our own buyers:

> *"A man who told me on Wednesday that he loved me and then ghosted me on Sunday"*
> *"hes not spoke to me in 7 or 8 weeks now we never even fought"*
> *"He left 9 months ago no contact"*

n=1,007 · 106 buyers · **USD 61.25 revenue per 1,000 sends · index 1.15 · top buyer only 2%**
*(written without a dollar sign on purpose — `copy-check` flags any `$nn` that is not a deck
price, and it is right to: a metric and a price look identical to a regex.)* · ⭐ **share DOUBLED
over the window (0.94% → 1.84%) — the biggest riser in the entire pull.** Etsy confirms the words
at rank 8, *"NO CONTACT Tarot Reading"*.

⚠ *"we never even fought"* is the thing to write into. Most of these women have **no incident**.
A letter that assumes a row has already lost the majority of them.

## 5 · Your opening shape — **QUESTION FIRST**

Open on **a real buyer's line, in her own spelling, at the very top** — then the cut. Take one
from §4 or from the VOC bank. ⛔ Do not clean up the spelling or the grammar. ⛔ Do not attribute
it to a named person; it is one woman's line, unnamed.

Day 2 already ran this shape. ⛔ Open on a *different* line and get to the card a different way.

## 6 · ⭐ CHOOSE THE CARD — this is yours to decide, and it locks the art

No card has been chosen for day 9. Pick one upright Rider-Waite card for position 1, and say why
its **picture** carries *"the plain shape of the silence — what stopped, what did not stop, and
how long it has actually run."*

⛔ **Already face up in this run — a repeat reads as a deck that is not being cut:**
`two-of-cups` · `eight-of-wands` · `the-hierophant` · `six-of-cups` · `four-of-swords` ·
`six-of-pentacles` · `ten-of-pentacles`

⚠ Four other drafts of this same letter chose `five-of-cups`, `the-hanged-man`,
`knight-of-pentacles` and `eight-of-cups`. Only one draft ships, so those are **not** banned — but
picking a different card gives us more to compare. Pick the one that genuinely does the job.

⛔ **Upright only.** Only the 22 majors have a reversed photograph on file; a reversed minor 404s
in a paying customer's PDF.

⭐ **Picture before meaning.** Describe what is physically on the card first — what a person would
see — then what it means. The card art is attached to the email, so she is looking at it while she
reads. No metaphor she has to decode.

## 7 · The metadata table — parsed by the build script, so it is a contract

Head the file exactly as the reference letter does. `scripts/build-07-daily-v2.py` reads these:

- **Free** — `**1** — how long it's really been`
- **Paid** — `**+6** — ` the six paid position names joined by ` · `
- **Shape** — one line naming the letter's shape and the topic
- **Cards** — `` `evelyn/tarot-rws/<your-card-slug>` ``
- **Links** — must contain `?c=1…3&s=hes-gone-quiet`
  ⛔ **the FULL registry key.** A short slug makes the booking guard fail silently.

Title line must be `# 07-D3 · Tuesday — He's Gone Quiet *(the <Card>)*`.
Then **Subject** and **Preheader** lines, then the letter in beats.

## 8 · Hard rules — each one has cost this offer something

- ⛔ **No price, no delivery promise.** Both live on the booking page only.
- ⛔ **Never a date on another person's decision.** *"The date moved"* is the single most repeated
  complaint in the entire buyer pull and it is the scam signature she actively scans for. You may
  say what he is doing. Never say when he stops. ⚠ On a silence letter the temptation is
  *"he'll be back within…"* — that sentence ends the programme.
- ⭐ **Marcus reads the man, flat.** The old *"I read the cards, not the man"* rule was
  **withdrawn** and the disclaimer **deleted from the booking page**. What the quiet keeps
  available to him gets said plainly. ⛔ Do not write a hedge or a disclaimer back in.
- ⛔ **No shame.** She has been checking her phone for weeks and she knows it. Blunt about the
  silence, never about her. Buyers praise the pairing: *"Bluntly honest answers. She was
  empathetic but genuine."*
- ⛔ **Complete on its own.** At ~25% opens most of the list sees a fraction of the sends. Never
  *"as I said on Monday"*.
- ⛔ **No contact-strategy advice.** Position 6 is *her limit*, not a message to send him. Do not
  turn this into a no-contact-rules letter.
- Give the letter **its own big idea, problem and promise**, out of this named thing.
  ⭐ The house standard is a **promise about her life, guarded by a refusal** — e.g. *"I'm not
  going to tell you he comes back."* Four of the first six do this; two missed it. Do not miss it.

## 8b · ⛔ LENGTH — ~1,000 words

**Target ~1,000 words of letter. `copy-check` warns over 1,200.** Set by the operator 2026-09-06.

⚠ There was never a house length before this. The first six letters happened to land at
1,700–2,100 and that accident hardened into a "standard" that got written into briefs — so three
drafts of THIS letter came in at 1,690, 1,903 and 1,936 and were all too long. ⛔ Do not pad to
reach a word count and do not treat 1,200 as the target; 1,000 is the target.

## 9 · The gate — get this green before you report

```bash
cd improve-v1/v1-one-time-BEs
node scripts/copy-check.cjs copy/07-marcus/daily/07-D3-hes-gone-quiet.md
python3 scripts/build-07-daily-v2.py --check hes-gone-quiet
```

The first fails on a price or a delivery promise. The second proves every metadata cell parses.

## 10 · Report back

The subject line · the buyer line you opened on · **the card and why its picture does the job** ·
the big idea in one sentence · the refusal that guards the promise · both command results · and
the one paragraph you are least sure of.
