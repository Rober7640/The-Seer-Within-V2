# BRIEF · one Marcus daily — **Problem, Action, Outcome**

One email to ~76,000 women. Free daily reading. Its job is to make her arrive at the booking page
**with a question worth asking**.

⭐ **The second of the recognisable three-card formats.** Where *past / present / future* reads what
was **put in her**, this one reads what she **does**. Between them they cover the two halves of any
morning without either going stale.

## 1 · Read first, and it is binding

**`copy/07-marcus/marcus-voice-profile.md`** — voice, the ten beats with their word budget, the
referent rule, the arrival bank and rotation, the send mechanics, what to cut when it runs long.
⭐ **§2 is the shape of your letter.** ⛔ This brief does not restate any of it; where the two
disagree, the profile wins.

⚠ Do **not** read other letters in `daily/` or `daily/compare/`.

## 2 · Why a plain format is allowed to be the product

Nobody shops for a named spread — card structure appears three times in ~130 Etsy listings and
never as the product. That finding retired seven bespoke in-house spreads.

**But an inbox is not a shop.** On a listing she has ten words and two seconds and picks the title
that names her problem. In an email Marcus has a thousand words to set the frame before he asks for
anything, so a structure she **already recognises** costs him no explaining at all.

⭐ **The format is generic on purpose; the reading is not.** The position names are the plainest in
tarot. The `job` strings are where everything lives. ⛔ Do not write generic prose to match generic
labels — that inverts the whole idea and it is the one way this format fails.

## 3 · The spread — `problem-action-outcome` · 1 free + 2 paid

**Her question:** *What do I actually do about this?*

| # | | Position | `job` — what it must FIND |
|---|---|---|---|
| 1 | **FREE** | The problem | What is actually in the way, **named as one thing she could point at**. Not the version she would give if somebody asked her, and not a feeling |
| 2 | paid | The action | The thing she can begin **before this week is out**, and what beginning it costs her. ⛔ Not permission, and not something she is waiting on anybody else to decide |
| 3 | paid | The outcome | What is different **in her own week** once she has begun it — in things she can see. ⛔ Never a date, and never another person's response |

⛔ **Marcus turns THE PROBLEM on her behalf. Only that one.** The letter reads position 1 and
nothing else.

⛔ **Exactly TWO face down.** Say two. The profile's examples use larger spreads — count off *this*
spread. The count is the product; a wrong count in the pitch is a wrong withhold.

**What she buys**, if you need it for the pitch: the two face-down cards turned and read **against
her own question**, plus three more off the same morning's cut. ⛔ Do not itemise it — she is
buying an answer, not an inventory.

## 4 · ⭐ THE PROBLEM CARD — name the real one, not the presenting one

This is the mechanic, and it is what makes a plain format land as personal.

**She already has a name for her problem. It is not the real one.** What she gives you is the tidy
version she says out loud when somebody asks, or the loudest thing rather than the thing actually
in the way. What
the card finds is the one underneath: **specific enough to point at, and not a feeling.**

| ✅ A problem she can point at | ⛔ Not a problem |
|---|---|
| *"you are the only person in the house who notices what has run out"* | *"you feel overwhelmed"* |
| *"every plan you make has to survive somebody else changing theirs"* | *"there is a blockage in your energy"* |
| *"you have been waiting for a conversation that the other person does not know is owed"* | *"you are at a crossroads"* |

⭐ **Broad and specific at once.** It must be a thing nearly anyone on the list can find themselves
in — *and* concrete enough that she can put a finger on it. ⛔ If it only works for a woman waiting
on a man, it is too narrow. If she could nod at it and forget it by lunchtime, it is too vague.

## 5 · 🔴 THE TRAP — position 3 is called "the outcome"

A card position called **outcome** is one sentence away from a **dated prediction**, and *"they give
you a timeline and then keep changing it"* is the most repeated complaint in the entire buyer pull.
It is the scam signature she actively scans for.

- ⛔ No date, no window, no *"within a fortnight"*, no *"by the time the month turns"*.
- ⛔ No forecast of anybody else's behaviour. Not *"he softens"*, not *"they finally ask"*.
- ✅ The outcome is **what changes in her own week, in things she can see** — the position's own
  job says so.
- ⭐ Make the refusal explicit and give it a reason, as the profile's beat 10 asks. This letter is
  the one where a reader most expects a fortune, so refusing one is the most credible thing in it.

## 6 · Choose the card

Pick one **upright** Rider-Waite card for the problem position. Say why its **picture** carries
*"what is actually in the way, named as one thing she could point at."*

⛔ Upright only — a reversed minor has no scan and 404s in a paid PDF.
⛔ **Do not reuse:** `two-of-cups` · `eight-of-wands` · `the-hierophant` · `six-of-cups` ·
`four-of-swords` · `six-of-pentacles` · `ten-of-pentacles` · `five-of-cups` · `the-hanged-man` ·
`knight-of-pentacles` · `eight-of-cups` · `seven-of-pentacles` · `two-of-pentacles` · `six-of-swords`

## 7 · The arrival

From the profile's §4 bank. ⛔ **Not "Marcus here."** — ten of the last twelve drafts opened that
way. ⚠ Arrival #6 names a card count; if you use it, say **two**.

## 8 · Format

- **Free** — `**1** — the problem`
- **Paid** — `**+2** — the action · the outcome`
- **Cards** — `` `evelyn/tarot-rws/<your-card-slug>` ``
- **Links** — `?c=1…3&s=problem-action-outcome` ⛔ the FULL key
- Title: `# 07-D3 · Tuesday — Problem, Action, Outcome *(the <Card>)*`
- Then **Subject** and **Preheader**, then the letter.

⛔ Three CTAs at `?c=1`, `?c=2`, `?c=3`. Only `c=1` makes two thirds of the ladder unreachable.
⛔ Her name is `{{ subscriber.first_name | capitalize }}` — exactly that.

## 9 · Length

**~1,000 words.** `copy-check` warns over 1,200. 1,000 is the target, not the floor.

## 10 · Gate

```bash
cd improve-v1/v1-one-time-BEs
node scripts/copy-check.cjs <your file>
```

## 11 · Report

Subject line · the card and why its picture does the job · **the problem you named, in one
sentence** · word count · copy-check result · your arrival · **the refusal you used on position 3** ·
the one paragraph you are least sure of.

Then: anything in the profile or this brief that was unclear, missing, or made the letter worse.
