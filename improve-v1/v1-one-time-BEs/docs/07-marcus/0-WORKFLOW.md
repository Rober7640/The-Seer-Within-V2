# 07 · How to make one daily email

**Plain version, written 2026-09-07.** Ten steps. Read this, then the voice profile.

> **Pick a card. The card tells you which cut to lay. Write the letter about that cut. Check it.
> Build it. Send it.**

---

## 1 · Pick the card

One card. It is the card sitting on the cut this morning. You pick it. The letter says the deck did.

⭐ **A card is never used up.** The Hermit can come up as often as it likes. What has to be new the
second time is the reading, not the card.

## 2 · Look up its door

Every card leads to one cut. The list is in the voice profile, §5.

| The card signals | The cut |
|---|---|
| something carried alone and unsaid | **Problem, Action, Outcome** ✅ live |
| something taken once and still running | Past, Present, Future ☐ |
| a fork she has already leaned toward | Should I Stay or Go ☐ |
| an answer that hasn't come | He's Gone Quiet ☐ |

Card not on the list? Decide where it goes and add it. ⛔ Same card, same door, every time — that is
what lets her learn the system.

## 3 · Pick the shape

How many face up, how many face down.

| | |
|---|---|
| **Face up** | one, normally. Two makes a long letter and both two-card drafts had to be cut four times to fit. ⛔ Never three |
| **Face down** | four or five beats two. `min_cards_per_answer: 5` tops her paid answer up from the open cut, so at only two paid cards, three of the five she receives are the same generic positions every buyer gets on every morning |

⛔ **The count beat argues shape, never quantity.** *"A door is three things"* is safe. *"Six still
face down"* said as a boast is not — on the day it is two, two looks like less for the same money.

## 4 · Write the brief

One short page. Examples in [`briefs/`](./briefs/).

- The card, and what is painted on it
- What the card **signals** — the general thing, from the picture
- Which cut it leads to, and why
- The `job` line for each free position — ⛔ copied word for word out of `scripts/07-spreads.json`
- The names of the paid positions, for the count beat only
- A woman's name for the story that has never been used before
- What tomorrow's teaser points at

## 4b · ⛔ Open the card scan. Every time.

All 78 cards and their reversals are on disk at `assets/tarot-rws/<card>.png`. Open the file and look
at it before you write a word of description.

🔴 **This is not optional.** On 2026-09-08 a brief written from memory said the Eight of Swords'
binding cloth was red — it is white, and the *dress* is red — and two of five letters shipped that
into copy any reader can check in ten seconds. Three writers opened the scan and corrected it; two did
not.

⚠ **And opening it is not the same as checking it.** One writer verified the foreground, built its
hinge line on *"there is no dry ground anywhere in that picture"*, and missed the red-roofed building
on a dry crag behind her. Check the part of the picture your argument depends on, not the part you
already like.

## 5 · Write the letter

Follow the 21 beats in the voice profile §4, in that order. Two rules matter more than the rest.

**The card gets read twice, and the two readings must say different things.**

| | |
|---|---|
| **The signal** | what the card says in general, from the picture. This is what picked the cut. Same every time |
| **The position** | what it means in seat one of that cut. This is the reading. New every time |

⛔ Cover the position name. If the second reading still makes sense, you have read the card twice and
the spread not at all.

**The question near the end must be one she can paste into the box.** The box sits before payment, so
she will be looking at it seconds after reading your line. *"What do I do about the person I haven't
told?"* works. *"Who is the one person who doesn't know?"* does not — she cannot type that as a
question and no card can be laid on it.

## 6 · Check it

```
node scripts/copy-check.cjs copy/07-marcus
```

Fails on a price, on a delivery promise, on hedge words. Warns over 1,200 words. Then run the short
list at the end of the voice profile by eye.

⭐ **And the one test that is not in any script: strip the CTA out. Is the letter still worth having
read?** If she would forward it with the ask removed, it is not salesy, whatever the split. If she
would not, no split saves it.

## 7 · Watch the one thing that goes stale

The withhold sentence — *"it shows me X, it won't tell me Y, two cards say, one can't."* Same shape,
same place, every morning. She will learn it by week two, and after that the letter reads as an
advert with a card attached.

⛔ Rotate its **form**, not just its content. Some mornings a question. Some a refusal. Some
mornings stop, and let the count beat carry it with no sentence at all.

⭐ And once in a while, let the card route to a morning with nothing to sell — *"this one doesn't
need three cards. One says it."* Only possible because the card decides. It buys more credibility
than any single pitch earns. ⚠ It still has to name the offer, because at ~25% opens a product named
only on give-days is one most of the list never hears about.

## 8 · Build the HTML

```
python3 scripts/build-07-daily-v2.py      # markdown -> email
python3 scripts/preview-07-daily.py       # the preview twin
```

## 9 · Make the picture — Codex does this

Nobody lays real cards. **Codex generates the photograph**, and the whole path already exists.

**9a · Add one block to [`07-art-prompt.md`](./07-art-prompt.md).** The doc is the source — the
script reads HEAD + your block + TAIL, so HEAD and TAIL are identical across every letter by
construction. Copy the shape of an existing block exactly:

```
### <spread-key> · <Title> — 1 face up, 4 face down → `assets/07-<spread-key>-rws.png`

​```
THE CARDS: five tarot cards on the cloth in front of the raven. One lies FACE UP by itself…
[name the Rider-Waite card and describe what is painted on it, in plain declarative sentences]
The other FOUR lie FACE DOWN in one tight row… Laid by hand and it shows: the row not quite
straight, two or three cards at slightly wrong angles.
​```
```

⛔ **The counts in the heading, the counts in the prompt and the counts in the letter must agree.**
The heading says *1 face up, 4 face down*; the letter's caption says *one turned, four not*; the
prompt lays exactly that many. A mismatch ships an email whose picture contradicts its own copy.

⛔ **The card is not a choice.** The letter inlines that card's RWS scan and describes what is on it.
Change the card here and the photograph silently disagrees with the email.

**9b · Generate it.**

```
python3 scripts/make-07-day-art.py <spread-key>          # keyed on the spread key, not the weekday
python3 scripts/make-07-day-art.py --print <spread-key>  # show the composed prompt, generate nothing
```

⚠ **Two things that waste an afternoon, both documented in `gen-image.py` and both real:**

| | |
|---|---|
| **stdin** | `codex exec` reads stdin whenever it is not a TTY and then blocks forever on *"Reading additional input from stdin…"*. `gen-image.py` passes `stdin=DEVNULL`. Do not remove it |
| **Prompt length** | keep it declarative and about the length of the existing blocks. ⛔ A long, shouty prompt full of ⛔ lines makes Codex deliberate past the timeout and return **nothing** — no error, no file. This is the same failure that killed a 20-minute Codex writing run on 2026-09-07 |

**9c · Host and wire it.**

```
python3 scripts/optimize-07-art.py                       # -> assets/email/
node scripts/host-be-asset.cjs file <src> marcus/<key>
python3 scripts/wire-07-art.py                           # point the .html at it (idempotent)
```

⛔ Rider-Waite only. It has to read as a photograph of cards on a real table — the picture is the
evidence the cut happened, and a flat graphic proves nothing. A reversed **minor** has no scan and
404s.

## 10 · Send

AWeber list `6960130`.

---

## One-time setup — do these once, then never again

**A · Sign as Marcus.** ⭐ Decided 2026-09-07. AWeber list `6960130` still sends as **Evelyn**, and
both prior sends to these 76,718 people went out under her name.

⛔ **This cannot be scripted.** The from-name and from-address live in AWeber's own list settings,
not in any file in this repo, and the API does not expose them. Change it by hand in the AWeber web
UI — list `6960130` → sender name **Marcus Stone**, and a from-address that matches. Nothing else in
the programme is blocked on it, and everything is blocked on it, because a Marcus letter signed
Evelyn is a different sender.

**B · Prove `spread_key` lands on the order.** ⭐ Better news than the 30-day plan says — the code is
already written. Verified 2026-09-07:

| Link in the chain | State |
|---|---|
| `spread_key` on `be_orders` in `shared/schema.ts` | ✅ present |
| `migrations/2026-09-03-be-07-daily.sql` | ✅ exists, purely additive, `IF NOT EXISTS` throughout, safe to re-run |
| Booking page reads `&s=` off the URL | ✅ `07-C1-booking-page-h2.html` |
| It reaches Stripe metadata | ✅ `server/routes/backendOffers.ts:445` |
| It is written onto the order | ✅ `server/lib/beOrders.ts:76,191` |
| The readout rolls up per spread | ✅ `scripts/07-readout.mjs` |

So Phase 0 tasks 0.1, 0.3, 0.4 and 0.5 in [`07-30-DAY-PLAN.md`](./07-30-DAY-PLAN.md) are **done and
that plan is stale.** ⛔ Two things are still genuinely open and neither is code:

1. **Has the migration actually run against Supabase?** Nobody has checked. Dev and production share
   one database, so ⛔ run the `.sql` file — never `npm run db:push`, which diffs the whole schema
   and would carry unrelated drift into production.
2. **One real test purchase** through a live `&s=` link, then look at the row. Until a key has
   landed on an order once, the chain is written but unproven.

---

## 🔴 What stops a send today

| Blocker | What it means |
|---|---|
| **No pictures** | no photograph exists for any of these cuts. Step 9 is the fix and it is now a script, not a shoot |
| **The two items above** | both one-time, neither is code |
| ⚠ **Build scripts untested on the new files** | their old inputs were in the `daily/` folder that was cleared |

---

## Where each rule lives

| Question | File |
|---|---|
| How does Marcus sound? What are the beats? | `copy/07-marcus/marcus-voice-profile.md` |
| What are the positions in this cut? | `scripts/07-spreads.json` |
| What is she buying, and for how much? | `copy/07-marcus/07-C5-tiers-by-questions-asked.md` |
| Which subjects reach enough of the list? | `docs/07-marcus/voc/10-broad-frames.md` |
| Is my draft safe to send? | `scripts/copy-check.cjs` |
| What does the art have to satisfy? | `copy/07-marcus/README.md` |

⛔ **Not this one:** `docs/07-marcus/marcus-voice-profile-esl-letters.md` governs the one-off backend
letters for offers 02–06. Different reader, different shape, and it uses "Namaste". Do not write a
daily to it.
