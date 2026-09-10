# BRIEF · one Marcus daily — **Past, Present, Future**

One email to ~76,000 women. Free daily reading. Its job is to make her arrive at the booking page
**with a question worth asking**.

⭐ **This is a new format and the first letter written on it.** Everything before it used a
bespoke six- or seven-card spread with an invented name. This uses the oldest three-card cut there
is, and that is the whole point.

## 1 · Read first, and it is binding

**`copy/07-marcus/marcus-voice-profile.md`** — voice, the ten beats with their word budget, the
referent rule, the arrival bank and rotation, the send mechanics, what to cut when it runs long.
⭐ **§2 is the shape of your letter.** ⛔ This brief does not restate any of it; where the two
disagree, the profile wins.

⚠ Do **not** read other letters in `daily/` or `daily/compare/`. A rival draft of this exact
letter is being written in parallel and several drafts of other letters live there.

## 2 · Why this format exists — read before you write a word

Nobody shops for a named spread. Card structure appears three times in ~130 Etsy listings and
never as the product, which is why seven bespoke in-house spreads were retired.

**But an inbox is not a shop.** On a listing she has ten words and two seconds and picks the title
that names her problem. In an email Marcus has a thousand words to set the frame before he asks
for anything — so a structure she **already recognises** costs him no explaining at all.

⭐ So: **the format is generic on purpose; the reading is not.** The position names are the plainest
in tarot. The `job` strings are where everything lives. ⛔ Do not write generic prose to match the
generic labels — that inverts the whole idea.

## 3 · The spread — `past-present-future` · 1 free + 2 paid

**Her question:** *What is actually going on with me?*

| # | | Position | `job` — what it must FIND |
|---|---|---|---|
| 1 | **FREE** | The past | What was put in her once and stayed. **Not the event — the rule she took from it**, and has been arranging herself around ever since |
| 2 | paid | The present | What that rule is doing to her week now. The specific thing she does, or does not do, because of it — something that happened in the **last seven days** |
| 3 | paid | The future | What it keeps costing while the rule stands, and **the one act that puts it down**. ⛔ Never a date, never a prediction about another person |

⛔ **Marcus turns THE PAST on her behalf. Only that one.** The letter reads position 1 and nothing
else.

⛔ **There are exactly TWO face down.** Not five, not six. Say two. The profile's examples use
larger spreads — count off *this* spread. A wrong count in the pitch is a wrong count in the
withhold, and the count is the product.

**What she actually buys**, if you need it for the pitch: the two face-down cards turned **and read
against her own question**, plus three more off the same morning's cut. Five cards on her question
at the first rung. ⛔ Do not itemise this in the letter — she is buying an answer, not an inventory.

## 4 · ⭐ THE PAST CARD NAMES A PLANTED BELIEF

This is the mechanic, and it is what makes a generic format land as personal.

**Somebody said something once, or did something once, and she took a rule from it.** She has been
arranging her life around that rule ever since and has stopped noticing it is there. It can be a
remark. It can be a trauma. It is never an event she would list if you asked her what happened.

⭐ **Universality is the engine here, not a compromise.** The broadest human facts, named precisely,
land as the *most* personal — because almost nobody ever says them out loud.

⛔ **The knife-edge.** Done well it is recognition. Done badly it is a horoscope she has read a
thousand times and the letter dies on the spot. The difference is **a scene and a cost**:

| ✅ Recognition | ⛔ Horoscope mush |
|---|---|
| a scene, and a price she has paid | an abstraction anyone could nod at and forget |
| names a mechanism she can point at | could be said to anybody |

⛔ **No example belief is given here on purpose.** A previous version of this brief supplied one, and
it was good enough that it became the obvious thing to use. Find your own.

⛔ Never make her analyse her own wording. Never a concept-noun where a picture belongs.

## 5 · Choose the card

Pick one **upright** Rider-Waite card for the past position. Say why its **picture** carries *"what
was put in her once and stayed — the rule, not the event."*

⛔ Upright only — a reversed minor has no scan and 404s in a paid PDF.
⛔ **Do not reuse:** `two-of-cups` · `eight-of-wands` · `the-hierophant` · `six-of-cups` ·
`four-of-swords` · `six-of-pentacles` · `ten-of-pentacles` · `five-of-cups` · `the-hanged-man` ·
`knight-of-pentacles` · `eight-of-cups` · `seven-of-pentacles` · `two-of-pentacles` ·
`six-of-swords` · `eight-of-swords` · `page-of-pentacles` · `ten-of-wands`

⚠ `eight-of-swords` is on that list because two earlier drafts of this exact letter both chose it —
independently. It is the obvious answer. Find a better one or a different one.

## 6 · The arrival

Pick from the profile's §4 arrival bank. ⛔ **Not "Marcus here."** — ten of the last twelve drafts opened
that way and it is worn out.

⚠ Arrival #6 names a card count; if you use it, say **two**, not six.

## 7 · Format

Metadata table per the profile's §5 (THE SEND). The cells the build parses:

- **Free** — `**1** — the past`
- **Paid** — `**+2** — the present · the future`
- **Cards** — `` `evelyn/tarot-rws/<your-card-slug>` ``
- **Links** — `?c=1…3&s=past-present-future` ⛔ the FULL key
- Title: `# 07-D3 · Monday — Past, Present, Future *(the <Card>)*`
- Then **Subject** and **Preheader**, then the letter.

⛔ Three CTAs at `?c=1`, `?c=2`, `?c=3`. A letter carrying only `c=1` makes two thirds of the
ladder unreachable.
⛔ Her name is `{{ subscriber.first_name | capitalize }}` — exactly that.

## 8 · Length

**~1,000 words.** `copy-check` warns over 1,200. ⛔ 1,000 is the target, not the floor. Do not pad.

## 9 · Gate

```bash
cd improve-v1/v1-one-time-BEs
node scripts/copy-check.cjs <your file>
```

## 10 · Report

Subject line · the card and why its picture does the job · **the planted belief you named, in one
sentence** · word count · copy-check result · your arrival · the refusal guarding your promise ·
the one paragraph you are least sure of.

Then: **anything in the voice profile or this brief that was unclear, missing, or made the letter
worse.** A specific gap is worth more than a clean letter.
